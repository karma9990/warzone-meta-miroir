using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

public sealed partial class WzproCompanionApp
{
    // Native in-process capture of the focused game window (no PowerShell spawn).
    // Writes to the temp PNG the Node engine reads, so OCR has a fresh frame without
    // the engine launching PowerShell for screenshots.
    private void NativeCaptureTick()
    {
        try
        {
            IntPtr handle = GetForegroundWindow();
            bool gameFocused = false;
            NativeRect r = new NativeRect();
            if (handle != IntPtr.Zero)
            {
                uint pid;
                GetWindowThreadProcessId(handle, out pid);
                string pname = "";
                try { pname = Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant(); }
                catch { pname = ""; }
                if (GameProcessNames.Contains(pname) && GetWindowRect(handle, out r)
                    && (r.Right - r.Left) >= 640 && (r.Bottom - r.Top) >= 360)
                {
                    gameFocused = true;
                }
            }

            // A pinned monitor lets us capture that screen even when the game is not the
            // foreground window (alt-tab, overlay focus...), as long as Warzone is running.
            bool pinned = captureMonitorIndex >= 0 && captureMonitorIndex < Screen.AllScreens.Length;
            bool captureNow = gameFocused || (pinned && AnyGameProcessRunning());
            if (!captureNow)
            {
                // Stop recording after a few ticks without the game in focus.
                if (recorderActive && ++noGameTicks >= 3) StopRecorder();
                return;
            }
            if (gameFocused) noGameTicks = 0;

            // Premium + clips: keep the rolling clip buffer running while in game.
            if (gameFocused && premiumAccessActive && highlightsProEnabled && !recorderActive)
            {
                StartRecorder();
            }

            // Which display to grab: the pinned one, else the screen the game window sits on.
            int screenIdx = pinned ? captureMonitorIndex : MonitorIndexForWindow(handle);
            screenIdx = ClampInt(screenIdx, 0, Math.Max(0, Screen.AllScreens.Length - 1));

            // Primary path: OBS-style display capture via ffmpeg ddagrab (DXGI Desktop
            // Duplication). Unlike GDI it captures EXCLUSIVE-FULLSCREEN games. It runs off
            // the UI thread; the Node engine just reads whatever fresh frame lands on disk.
            if (displayCaptureMode != 2)
            {
                if (!displayCaptureBusy)
                {
                    displayCaptureBusy = true;
                    int outputIdx = screenIdx;
                    System.Threading.Tasks.Task.Run(delegate
                    {
                        bool ok = false;
                        try { ok = GrabDisplayFrame(outputIdx, NativeScreenshotPath); }
                        catch { ok = false; }
                        finally
                        {
                            if (displayCaptureMode == 0) displayCaptureMode = ok ? 1 : 2;
                            displayCaptureBusy = false;
                        }
                    });
                }
                if (displayCaptureMode != 2) return; // ddagrab owns the frame
                // ddagrab unavailable on this machine: fall through to GDI from here on.
            }

            // Fallback: GDI CopyFromScreen (windowed / borderless only).
            int capLeft, capTop, w, h;
            if (pinned)
            {
                Rectangle mb = Screen.AllScreens[screenIdx].Bounds;
                capLeft = mb.X; capTop = mb.Y; w = mb.Width; h = mb.Height;
            }
            else
            {
                capLeft = r.Left; capTop = r.Top; w = r.Right - r.Left; h = r.Bottom - r.Top;
            }
            if (w < 2 || h < 2) return;
            using (var bmp = new Bitmap(w, h))
            using (var g = Graphics.FromImage(bmp))
            {
                g.CopyFromScreen(capLeft, capTop, 0, 0, new Size(w, h));
                bmp.Save(NativeScreenshotPath, System.Drawing.Imaging.ImageFormat.Png);
                WarnIfBlackFrame(bmp);
            }
        }
        catch
        {
            // Best-effort; the engine falls back to its own capture if this frame is stale.
        }
    }

    // OBS-style display capture: one still frame of a monitor via ffmpeg ddagrab (DXGI
    // Desktop Duplication). Captures exclusive-fullscreen games that GDI returns black for.
    private bool GrabDisplayFrame(int outputIdx, string outPath)
    {
        ResolveFfmpeg();
        if (string.IsNullOrEmpty(ffmpegPath)) return false;
        string tmp = outPath + ".tmp.png";
        string args = "-y -hide_banner -loglevel error -f lavfi -i ddagrab=output_idx=" + outputIdx
            + ":framerate=10 -vf hwdownload,format=bgra -frames:v 4 -update 1 \"" + tmp + "\"";
        Process p = null;
        try
        {
            p = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = ffmpegPath,
                    Arguments = args,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            p.Start();
            if (!p.WaitForExit(6000)) { try { p.Kill(); } catch { } return false; }
            if (p.ExitCode != 0 || !File.Exists(tmp)) return false;
            // Copy onto the path the engine polls so it sees a fresh, fully-written frame.
            File.Copy(tmp, outPath, true);
            return true;
        }
        catch { return false; }
        finally
        {
            if (p != null) p.Dispose();
            try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
        }
    }

    private int MonitorIndexForWindow(IntPtr handle)
    {
        try
        {
            Screen s = handle != IntPtr.Zero ? Screen.FromHandle(handle) : Screen.PrimaryScreen;
            Screen[] all = Screen.AllScreens;
            for (int i = 0; i < all.Length; i++) if (all[i].DeviceName == s.DeviceName) return i;
        }
        catch { }
        return 0;
    }

    private bool AnyGameProcessRunning()
    {
        try
        {
            foreach (Process p in Process.GetProcesses())
            {
                try { if (GameProcessNames.Contains(p.ProcessName.ToLowerInvariant())) return true; }
                catch { }
                finally { p.Dispose(); }
            }
        }
        catch { }
        return false;
    }

    // Exclusive-fullscreen DX games come back black through GDI CopyFromScreen. Warn the
    // user once per session so they switch Warzone to Borderless / Windowed.
    private void WarnIfBlackFrame(Bitmap bmp)
    {
        if (blackFrameWarned || bmp == null) return;
        try
        {
            long sum = 0;
            int n = 0;
            int sx = Math.Max(1, bmp.Width / 8);
            int sy = Math.Max(1, bmp.Height / 8);
            for (int x = sx / 2; x < bmp.Width; x += sx)
                for (int y = sy / 2; y < bmp.Height; y += sy)
                {
                    Color c = bmp.GetPixel(x, y);
                    sum += c.R + c.G + c.B;
                    n++;
                }
            if (n > 0 && sum / (n * 3) < 8)
            {
                blackFrameWarned = true;
                AddLogLine(T("captureBlackHint"));
            }
        }
        catch { }
    }

    private void ResolveFfmpeg()
    {
        if (!string.IsNullOrEmpty(ffmpegPath)) return;
        try
        {
            string exeDir = Path.GetDirectoryName(Application.ExecutablePath) ?? "";
            string[] candidates =
            {
                Path.Combine(exeDir, "node_modules", "ffmpeg-static", "ffmpeg.exe"),
                Path.Combine(engineWorkingDirectory ?? exeDir, "node_modules", "ffmpeg-static", "ffmpeg.exe"),
            };
            foreach (string c in candidates)
            {
                if (File.Exists(c)) { ffmpegPath = c; return; }
            }
        }
        catch
        {
            // ignore
        }
        ffmpegPath = "ffmpeg"; // fall back to PATH; start will disable it if missing.
    }

    private void StartRecorder()
    {
        ResolveFfmpeg();
        if (string.IsNullOrEmpty(ffmpegPath)) return;
        if (recorderProcess != null && !recorderProcess.HasExited) return;

        recorderRecipeIndex = 0;
        recorderAudioDisabled = false;
        recorderStopping = false;
        lastRecorderError = "";
        try
        {
            Directory.CreateDirectory(BufferDir);
            foreach (string f in Directory.GetFiles(BufferDir, "seg_*.ts")) { try { File.Delete(f); } catch { } }
        }
        catch { }
        StartRecorderWithEncoder();
    }

    private void StartRecorderWithEncoder()
    {
        if (recorderRecipeIndex >= CaptureRecipes.Length) { recorderActive = false; return; }

        // Full-game and ask modes keep the whole match; social/raw keep a short rolling buffer.
        int wrap = (clipMode == "full" || clipMode == "ask") ? 600 : 24;

        // Optional multitrack audio (system + mic) as separate tracks, before the video input.
        string audioInputs = "";
        string audioMaps = "";
        if (!recorderAudioDisabled)
        {
            var devs = new System.Collections.Generic.List<string>();
            if (!string.IsNullOrEmpty(systemAudioDevice)) devs.Add(systemAudioDevice);
            if (!string.IsNullOrEmpty(micAudioDevice)) devs.Add(micAudioDevice);
            if (devs.Count > 0)
            {
                for (int k = 0; k < devs.Count; k++) audioInputs += "-f dshow -i audio=\"" + devs[k] + "\" ";
                audioMaps = "-map " + devs.Count + ":v";
                for (int k = 0; k < devs.Count; k++) audioMaps += " -map " + k + ":a";
                audioMaps += " -c:a aac -ac 2 ";
            }
        }

        string args = "-y -hide_banner -loglevel error "
            + audioInputs + CaptureRecipes[recorderRecipeIndex] + " " + audioMaps + "-g 60 "
            + "-f segment -segment_time 3 -segment_wrap " + wrap + " -reset_timestamps 1 -segment_format mpegts "
            + "\"" + Path.Combine(BufferDir, "seg_%03d.ts") + "\"";

        try
        {
            recorderProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = ffmpegPath,
                    Arguments = args,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardError = true,
                    RedirectStandardOutput = true,
                    WorkingDirectory = BufferDir
                },
                EnableRaisingEvents = true
            };
            recorderStartedUtc = DateTime.UtcNow;
            recorderProcess.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                if (!string.IsNullOrWhiteSpace(e.Data)) lastRecorderError = e.Data;
            };
            recorderProcess.OutputDataReceived += delegate { };
            recorderProcess.Exited += delegate
            {
                if (recorderStopping) return;

                // Recipe failed fast (unsupported encoder/capture) -> try the next recipe.
                if (recorderActive && DateTime.UtcNow.Subtract(recorderStartedUtc).TotalSeconds < 3)
                {
                    if (recorderRecipeIndex < CaptureRecipes.Length - 1)
                    {
                        recorderRecipeIndex++;
                        SafeUi(delegate { StartRecorderWithEncoder(); });
                    }
                    else if (!recorderAudioDisabled && (!string.IsNullOrEmpty(systemAudioDevice) || !string.IsNullOrEmpty(micAudioDevice)))
                    {
                        // All recipes failed WITH audio -> a device is likely busy; retry video-only.
                        recorderAudioDisabled = true;
                        recorderRecipeIndex = 0;
                        SafeUi(delegate { StartRecorderWithEncoder(); });
                    }
                    else
                    {
                        recorderActive = false; // all recipes failed; highlights fall back to Game Bar
                        SafeUi(delegate
                        {
                            UpdateSidebarStatuses();
                            AddRecorderExitLog();
                        });
                    }
                }
                else if (recorderActive)
                {
                    recorderActive = false;
                    SafeUi(delegate
                    {
                        UpdateSidebarStatuses();
                        AddRecorderExitLog();
                    });
                }
            };
            recorderProcess.Start();
            recorderProcess.BeginErrorReadLine();
            recorderProcess.BeginOutputReadLine();
            recorderActive = true;
            UpdateSidebarStatuses();
            try { recorderProcess.PriorityClass = ProcessPriorityClass.BelowNormal; } catch { }
        }
        catch (Exception ex)
        {
            ffmpegPath = "";
            recorderActive = false;
            UpdateSidebarStatuses();
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("recorderUnavailable") + ex.Message + Environment.NewLine);
        }
    }

    private void StopRecorder()
    {
        recorderActive = false;
        noGameTicks = 0;
        UpdateSidebarStatuses();
        if (recorderProcess != null && !recorderProcess.HasExited)
        {
            recorderStopping = true;
            try { recorderProcess.Kill(); recorderProcess.WaitForExit(1500); } catch { }
            finally { recorderStopping = false; }
        }
    }

    private void AddRecorderExitLog()
    {
        string detail = string.IsNullOrWhiteSpace(lastRecorderError) ? "ffmpeg stopped." : lastRecorderError;
        AddLogLine(T("recorderUnavailable") + detail);
    }

    // Save the recent rolling-buffer segments as a clip (premium highlight). Returns the path.
    private string SaveClip(string reason)
    {
        if (string.IsNullOrEmpty(ffmpegPath)) return "";
        try
        {
            FileInfo[] segs = new DirectoryInfo(BufferDir).GetFiles("seg_*.ts");
            if (segs.Length < 2) return ""; // need some buffered footage
            Array.Sort(segs, delegate(FileInfo a, FileInfo b) { return a.LastWriteTimeUtc.CompareTo(b.LastWriteTimeUtc); });

            // Exclude the newest segment (still being written), keep the requested
            // NVIDIA-like instant replay length before it.
            int end = segs.Length - 1;
            int segmentCount = Math.Max(2, (int)Math.Ceiling(Math.Max(5, highlightClipSeconds) / 3.0));
            int start = Math.Max(0, end - segmentCount);
            string listPath = Path.Combine(BufferDir, "concat_" + DateTime.Now.ToString("HHmmss_fff") + ".txt");
            var sb = new System.Text.StringBuilder();
            for (int i = start; i < end; i++)
            {
                sb.AppendLine("file '" + segs[i].FullName.Replace("\\", "/").Replace("'", "'\\''") + "'");
            }
            File.WriteAllText(listPath, sb.ToString());

            string clipDir = EffectiveClipsFolder();
            Directory.CreateDirectory(clipDir);
            string outPath = Path.Combine(clipDir, "highlight_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + "_" + reason + ".mp4");

            var p = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = ffmpegPath,
                    Arguments = "-y -hide_banner -loglevel error -f concat -safe 0 -i \"" + listPath + "\" -map 0 -c copy \"" + outPath + "\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            p.Start();
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipSaving") + outPath + Environment.NewLine);
            if (!p.WaitForExit(20000))
            {
                try { p.Kill(); } catch { }
                if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipFailed") + "ffmpeg timeout" + Environment.NewLine);
                return "";
            }
            if (p.ExitCode != 0 || !File.Exists(outPath) || new FileInfo(outPath).Length <= 0)
            {
                if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipFailed") + "ffmpeg exit " + p.ExitCode + Environment.NewLine);
                return "";
            }
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipSaved") + " " + outPath + Environment.NewLine);
            return outPath;
        }
        catch (Exception ex)
        {
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipFailed") + ex.Message + Environment.NewLine);
            return "";
        }
    }

    // Build a publishable best-of montage (fades, social format) from the session clips.
    private void BuildMontage(System.Collections.Generic.List<string> clips, string format)
    {
        if (string.IsNullOrEmpty(ffmpegPath) || clips == null || clips.Count == 0) return;
        string fmt;
        if (format == "square") fmt = "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p";
        else if (format == "horizontal") fmt = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p";
        else fmt = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p";

        try
        {
            string work = Path.Combine(BufferDir, "montage");
            Directory.CreateDirectory(work);
            foreach (string f in Directory.GetFiles(work)) { try { File.Delete(f); } catch { } }

            var normalized = new System.Collections.Generic.List<string>();
            int idx = 0;
            foreach (string clip in clips)
            {
                if (!File.Exists(clip)) continue;
                string n = Path.Combine(work, "n" + idx + ".mp4");
                // Keep the last 8s of each clip (the action), apply format + fade in/out.
                string args = "-y -hide_banner -loglevel error -sseof -8 -i \"" + clip + "\" "
                    + "-vf \"" + fmt + ",fade=t=in:st=0:d=0.4,fade=t=out:st=7.6:d=0.4\" -an "
                    + "-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \"" + n + "\"";
                var pn = new Process { StartInfo = new ProcessStartInfo { FileName = ffmpegPath, Arguments = args, UseShellExecute = false, CreateNoWindow = true } };
                pn.Start();
                pn.WaitForExit(30000);
                if (File.Exists(n)) normalized.Add(n);
                idx++;
            }
            if (normalized.Count == 0) return;

            string listPath = Path.Combine(work, "list.txt");
            var sb = new System.Text.StringBuilder();
            foreach (string n in normalized) sb.AppendLine("file '" + n.Replace("\\", "/").Replace("'", "'\\''") + "'");
            File.WriteAllText(listPath, sb.ToString());

            string clipDir = EffectiveClipsFolder();
            Directory.CreateDirectory(clipDir);
            string outPath = Path.Combine(clipDir, "montage_" + format + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".mp4");

            bool useMusic = !string.IsNullOrWhiteSpace(musicPath) && File.Exists(musicPath);
            string concatTarget = useMusic ? Path.Combine(work, "silent.mp4") : outPath;
            var p = new Process { StartInfo = new ProcessStartInfo { FileName = ffmpegPath, Arguments = "-y -hide_banner -loglevel error -f concat -safe 0 -i \"" + listPath + "\" -c copy \"" + concatTarget + "\"", UseShellExecute = false, CreateNoWindow = true } };
            p.Start();
            p.WaitForExit(30000);

            if (useMusic)
            {
                // Add the chosen track as the montage soundtrack, trimmed to the video length.
                string muxArgs = "-y -hide_banner -loglevel error -i \"" + concatTarget + "\" -i \"" + musicPath + "\" "
                    + "-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af afade=t=in:st=0:d=1 -shortest \"" + outPath + "\"";
                var pm = new Process { StartInfo = new ProcessStartInfo { FileName = ffmpegPath, Arguments = muxArgs, UseShellExecute = false, CreateNoWindow = true } };
                pm.Start();
                pm.WaitForExit(60000);
            }
            string saved = outPath;
            SafeUi(delegate { if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("montageSaved") + saved + Environment.NewLine); ShowToast(T("clipSaved")); });
        }
        catch (Exception ex)
        {
            string msg = ex.Message;
            SafeUi(delegate { if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("montageFailed") + msg + Environment.NewLine); });
        }
    }

    // Full-game mode: export the whole match (all buffered segments) + an AI coach text.
    private void ExportFullGame(string uploadedLine)
    {
        if (string.IsNullOrEmpty(ffmpegPath)) return;
        try
        {
            FileInfo[] segs = new DirectoryInfo(BufferDir).GetFiles("seg_*.ts");
            if (segs.Length < 1) return;
            Array.Sort(segs, delegate(FileInfo a, FileInfo b) { return a.LastWriteTimeUtc.CompareTo(b.LastWriteTimeUtc); });

            string listPath = Path.Combine(BufferDir, "fullgame_" + DateTime.Now.ToString("HHmmss") + ".txt");
            var sb = new System.Text.StringBuilder();
            // Skip the newest (still being written) segment.
            for (int i = 0; i < segs.Length - 1; i++)
            {
                sb.AppendLine("file '" + segs[i].FullName.Replace("\\", "/").Replace("'", "'\\''") + "'");
            }
            File.WriteAllText(listPath, sb.ToString());

            string clipDir = EffectiveClipsFolder();
            Directory.CreateDirectory(clipDir);
            string stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            string outPath = Path.Combine(clipDir, "game_" + stamp + ".mp4");
            var p = new Process { StartInfo = new ProcessStartInfo { FileName = ffmpegPath, Arguments = "-y -hide_banner -loglevel error -f concat -safe 0 -i \"" + listPath + "\" -map 0 -c copy \"" + outPath + "\"", UseShellExecute = false, CreateNoWindow = true } };
            p.Start();
            if (!p.WaitForExit(60000))
            {
                try { p.Kill(); } catch { }
                if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipFailed") + "ffmpeg timeout" + Environment.NewLine);
                return;
            }
            if (p.ExitCode != 0 || !File.Exists(outPath) || new FileInfo(outPath).Length <= 0)
            {
                if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipFailed") + "ffmpeg exit " + p.ExitCode + Environment.NewLine);
                return;
            }

            // AI coach summary derived from the game numbers (honest: stats-based, not video analysis).
            string coachPath = Path.Combine(clipDir, "game_" + stamp + "_coach.txt");
            File.WriteAllText(coachPath, BuildCoachText(uploadedLine));

            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("fullGameSaved") + outPath + Environment.NewLine);
            ShowToast(T("clipSaved"));

            // Fresh buffer for the next game.
            foreach (FileInfo f in segs) { try { f.Delete(); } catch { } }
        }
        catch (Exception ex)
        {
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipFailed") + ex.Message + Environment.NewLine);
        }
    }

    private string BuildCoachText(string uploadedLine)
    {
        int kills = ParseIntAfter(uploadedLine, "kills", -1);
        // "Uploaded game #N: X kills, Y damage, place #Z"
        Match dmgM = Regex.Match(uploadedLine, "([0-9]+)\\s*damage", RegexOptions.IgnoreCase);
        Match placeM = Regex.Match(uploadedLine, "place\\s*#?\\s*([0-9]+)", RegexOptions.IgnoreCase);
        int damage = dmgM.Success ? int.Parse(dmgM.Groups[1].Value) : -1;
        int place = placeM.Success ? int.Parse(placeM.Groups[1].Value) : -1;

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("WZPRO - " + T("coachTitle"));
        sb.AppendLine(DateTime.Now.ToString("yyyy-MM-dd HH:mm"));
        sb.AppendLine("");
        sb.AppendLine((kills >= 0 ? "Kills: " + kills : "") + (damage >= 0 ? "   Damage: " + damage : "") + (place > 0 ? "   Place: #" + place : ""));
        sb.AppendLine("");
        sb.AppendLine(T("coachAdviceTitle"));
        if (place == 1) sb.AppendLine("- " + T("coachWin"));
        if (kills >= 0 && kills < 2) sb.AppendLine("- " + T("coachLowKills"));
        if (kills >= 6) sb.AppendLine("- " + T("coachHighKills"));
        if (damage >= 0 && kills > 0 && damage / Math.Max(1, kills) > 350) sb.AppendLine("- " + T("coachDamageNoFinish"));
        if (place > 10) sb.AppendLine("- " + T("coachEarlyDeath"));
        sb.AppendLine("- " + T("coachGeneric"));
        return sb.ToString();
    }

    private static int ParseIntAfter(string text, string keyword, int fallback)
    {
        Match m = Regex.Match(text, "([0-9]+)\\s*" + Regex.Escape(keyword), RegexOptions.IgnoreCase);
        return m.Success ? int.Parse(m.Groups[1].Value) : fallback;
    }

    // End-of-game overlay (ask mode): the player picks a social montage or a coach export.
    private void ShowEndGameChoice(string uploadedLine)
    {
        pendingUploadedLine = uploadedLine;
        EnsureEndGameForm();
        Rectangle wa = Screen.PrimaryScreen.WorkingArea;
        endGameForm.Location = new Point(wa.Right - endGameForm.Width - 24, wa.Bottom - endGameForm.Height - 24);
        endGameForm.Show();
        endGameForm.BringToFront();
        if (endGameTimer == null)
        {
            endGameTimer = new Timer { Interval = 25000 };
            endGameTimer.Tick += delegate { ChooseEndGame("timeout"); };
        }
        endGameTimer.Stop();
        endGameTimer.Start();
    }

    private void EnsureEndGameForm()
    {
        if (endGameForm != null) { RefreshEndGameTexts(); return; }
        endGameForm = new Form
        {
            FormBorderStyle = FormBorderStyle.None,
            StartPosition = FormStartPosition.Manual,
            TopMost = true,
            ShowInTaskbar = false,
            BackColor = Color.FromArgb(12, 14, 22),
            Size = new Size(330, 152)
        };
        var title = new Label { Name = "egTitle", Location = new Point(16, 12), Size = new Size(298, 40), ForeColor = Color.White, Font = AppFont(9, FontStyle.Bold) };
        var social = new Button { Name = "egSocial", Location = new Point(16, 60), Size = new Size(146, 40), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(22, 60, 255), ForeColor = Color.White, Font = AppFont(8, FontStyle.Bold), Cursor = Cursors.Hand };
        social.Click += delegate { ChooseEndGame("social"); };
        var coach = new Button { Name = "egCoach", Location = new Point(168, 60), Size = new Size(146, 40), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(42, 42, 48), ForeColor = Color.White, Font = AppFont(8, FontStyle.Bold), Cursor = Cursors.Hand };
        coach.Click += delegate { ChooseEndGame("coach"); };
        var skip = new Button { Name = "egSkip", Location = new Point(16, 110), Size = new Size(298, 28), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(20, 20, 26), ForeColor = Color.FromArgb(170, 170, 175), Font = AppFont(7, FontStyle.Regular), Cursor = Cursors.Hand };
        skip.Click += delegate { ChooseEndGame("skip"); };
        endGameForm.Controls.Add(title);
        endGameForm.Controls.Add(social);
        endGameForm.Controls.Add(coach);
        endGameForm.Controls.Add(skip);
        RefreshEndGameTexts();
    }

    private void RefreshEndGameTexts()
    {
        if (endGameForm == null) return;
        foreach (Control c in endGameForm.Controls)
        {
            if (c.Name == "egTitle") c.Text = T("endGameTitle");
            else if (c.Name == "egSocial") c.Text = T("endGameSocial");
            else if (c.Name == "egCoach") c.Text = T("endGameCoach");
            else if (c.Name == "egSkip") c.Text = T("endGameSkip");
        }
    }

    private void ChooseEndGame(string kind)
    {
        if (endGameTimer != null) endGameTimer.Stop();
        HideEndGameChoice();
        if (kind == "social")
        {
            if (pendingGameClips.Count > 0)
            {
                var clipsCopy = new System.Collections.Generic.List<string>(pendingGameClips);
                string fmt = socialFormat;
                System.Threading.Tasks.Task.Run(delegate { BuildMontage(clipsCopy, fmt); });
            }
        }
        else if (kind == "coach")
        {
            ExportFullGame(pendingUploadedLine);
        }
        else if (kind == "skip")
        {
            DeletePendingGameClips();
        }
        pendingGameClips.Clear();
        ClearBuffer();
    }

    private void DeletePendingGameClips()
    {
        foreach (string clip in pendingGameClips)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(clip) && File.Exists(clip)) File.Delete(clip);
            }
            catch { }
        }
    }

    private void HideEndGameChoice()
    {
        if (endGameForm != null) endGameForm.Hide();
    }

    private void ClearBuffer()
    {
        try { foreach (string f in Directory.GetFiles(BufferDir, "seg_*.ts")) { try { File.Delete(f); } catch { } } } catch { }
    }
}
