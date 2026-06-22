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
    // ── Game Boost: temporarily switch to the High Performance power plan ──
    private static string RunPowercfg(string args)
    {
        try
        {
            using (Process p = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "powercfg.exe",
                    Arguments = args,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true
                }
            })
            {
                p.Start();
                string output = p.StandardOutput.ReadToEnd();
                p.WaitForExit(4000);
                return output ?? "";
            }
        }
        catch
        {
            return "";
        }
    }

    private void ToggleGameBoost()
    {
        // powercfg.exe calls block for ~1-2s; run them off the UI thread so the toggles stay responsive.
        if (boostBusy) return;
        boostBusy = true;
        System.Threading.Tasks.Task.Run(delegate
        {
            try { if (gameBoostActive) DisableGameBoost(); else EnableGameBoost(); }
            finally { SafeUi(delegate { boostBusy = false; RefreshOptimisationOptionsUi(); }); }
        });
    }

    // ── Advanced system optimisations (require admin; reversible) ───────────────
    // Each tweak applies a reversible Windows change; the original value is captured in
    // tweakBackups so toggling off restores it. tweakOn caches the live OS state so the UI
    // never spawns powercfg/fsutil/sc on a repaint.
    private static readonly string[] TweakIds =
    {
        "inputlag", "keyboard", "perfcounters", "gamemode", "priority", "netpower",
        "gamedvr", "coreparking", "lastaccess", "superfetch", "indexing", "ultimate"
    };
    private static readonly System.Collections.Generic.HashSet<string> TweakRebootIds =
        new System.Collections.Generic.HashSet<string> { "inputlag" };
    private const string NetClassPath = @"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}";

    private static string RunProc(string file, string args)
    {
        try
        {
            using (Process p = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = file,
                    Arguments = args,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            })
            {
                p.Start();
                string o = p.StandardOutput.ReadToEnd();
                p.WaitForExit(6000);
                return o ?? "";
            }
        }
        catch { return ""; }
    }

    private static int? RegGetDword(Microsoft.Win32.RegistryKey root, string path, string name)
    {
        try { using (var k = root.OpenSubKey(path)) { if (k == null) return null; object v = k.GetValue(name); return v == null ? (int?)null : Convert.ToInt32(v); } }
        catch { return null; }
    }

    private static string RegGetString(Microsoft.Win32.RegistryKey root, string path, string name)
    {
        try { using (var k = root.OpenSubKey(path)) { if (k == null) return null; object v = k.GetValue(name); return v == null ? null : v.ToString(); } }
        catch { return null; }
    }

    private void DwordTweak(Microsoft.Win32.RegistryKey root, string path, string name, int onValue, bool on, string id)
    {
        if (on)
        {
            int? cur = RegGetDword(root, path, name);
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, id)))
                tweakBackups = SetTrainingMapValue(tweakBackups, id, cur.HasValue ? "D" + cur.Value : "X");
            try { using (var k = root.CreateSubKey(path)) { if (k != null) k.SetValue(name, onValue, Microsoft.Win32.RegistryValueKind.DWord); } } catch { }
        }
        else
        {
            string b = GetTrainingMapValue(tweakBackups, id);
            try
            {
                using (var k = root.CreateSubKey(path))
                {
                    if (k != null)
                    {
                        if (b == "X" || b == "") { try { k.DeleteValue(name, false); } catch { } }
                        else if (b.StartsWith("D")) { int v; if (int.TryParse(b.Substring(1), out v)) k.SetValue(name, v, Microsoft.Win32.RegistryValueKind.DWord); }
                    }
                }
            }
            catch { }
            tweakBackups = SetTrainingMapValue(tweakBackups, id, "");
        }
    }

    private void StringTweak(Microsoft.Win32.RegistryKey root, string path, string name, string onValue, bool on, string id)
    {
        if (on)
        {
            string cur = RegGetString(root, path, name);
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, id)))
                tweakBackups = SetTrainingMapValue(tweakBackups, id, cur != null ? "S" + cur : "X");
            try { using (var k = root.CreateSubKey(path)) { if (k != null) k.SetValue(name, onValue, Microsoft.Win32.RegistryValueKind.String); } } catch { }
        }
        else
        {
            string b = GetTrainingMapValue(tweakBackups, id);
            try
            {
                using (var k = root.CreateSubKey(path))
                {
                    if (k != null)
                    {
                        if (b == "X" || b == "") { try { k.DeleteValue(name, false); } catch { } }
                        else if (b.StartsWith("S")) k.SetValue(name, b.Substring(1), Microsoft.Win32.RegistryValueKind.String);
                    }
                }
            }
            catch { }
            tweakBackups = SetTrainingMapValue(tweakBackups, id, "");
        }
    }

    private static int ServiceStart(string svc)
    {
        int? v = RegGetDword(Microsoft.Win32.Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Services\" + svc, "Start");
        return v ?? -1;
    }

    private void SetServiceDisabled(string svc, bool on, string id)
    {
        if (on)
        {
            int cur = ServiceStart(svc);
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, id)))
                tweakBackups = SetTrainingMapValue(tweakBackups, id, "D" + cur);
            RunProc("sc.exe", "stop " + svc);
            RunProc("sc.exe", "config " + svc + " start= disabled");
        }
        else
        {
            string b = GetTrainingMapValue(tweakBackups, id);
            int orig = 2;
            if (b.StartsWith("D")) { int v; if (int.TryParse(b.Substring(1), out v) && v >= 0) orig = v; }
            string word = orig == 3 ? "demand" : orig == 4 ? "disabled" : "auto";
            RunProc("sc.exe", "config " + svc + " start= " + word);
            if (orig != 4) RunProc("sc.exe", "start " + svc);
            tweakBackups = SetTrainingMapValue(tweakBackups, id, "");
        }
    }

    private static int FsutilLastAccess()
    {
        Match m = Regex.Match(RunProc("fsutil.exe", "behavior query disablelastaccess"), @"=\s*(\d)");
        return m.Success ? int.Parse(m.Groups[1].Value) : -1;
    }

    private void SetLastAccess(bool on)
    {
        if (on)
        {
            int cur = FsutilLastAccess();
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, "lastaccess")))
                tweakBackups = SetTrainingMapValue(tweakBackups, "lastaccess", "D" + cur);
            RunProc("fsutil.exe", "behavior set disablelastaccess 1");
        }
        else
        {
            string b = GetTrainingMapValue(tweakBackups, "lastaccess");
            int orig = 2;
            if (b.StartsWith("D")) { int v; if (int.TryParse(b.Substring(1), out v) && v >= 0) orig = v; }
            RunProc("fsutil.exe", "behavior set disablelastaccess " + orig);
            tweakBackups = SetTrainingMapValue(tweakBackups, "lastaccess", "");
        }
    }

    private static int CoreParkingMinCores()
    {
        Match m = Regex.Match(RunPowercfg("/q scheme_current sub_processor CPMINCORES"), @"Current AC Power Setting Index:\s*0x([0-9a-fA-F]+)");
        if (m.Success) { try { return Convert.ToInt32(m.Groups[1].Value, 16); } catch { } }
        return -1;
    }

    private void SetCoreParking(bool on)
    {
        if (on)
        {
            int cur = CoreParkingMinCores();
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, "coreparking")))
                tweakBackups = SetTrainingMapValue(tweakBackups, "coreparking", "D" + cur);
            RunPowercfg("-setacvalueindex scheme_current sub_processor CPMINCORES 100");
            RunPowercfg("-setdcvalueindex scheme_current sub_processor CPMINCORES 100");
            RunPowercfg("-setactive scheme_current");
        }
        else
        {
            string b = GetTrainingMapValue(tweakBackups, "coreparking");
            int orig = 100;
            if (b.StartsWith("D")) { int v; if (int.TryParse(b.Substring(1), out v) && v >= 0) orig = v; }
            RunPowercfg("-setacvalueindex scheme_current sub_processor CPMINCORES " + orig);
            RunPowercfg("-setdcvalueindex scheme_current sub_processor CPMINCORES " + orig);
            RunPowercfg("-setactive scheme_current");
            tweakBackups = SetTrainingMapValue(tweakBackups, "coreparking", "");
        }
    }

    private static string ActiveSchemeGuid()
    {
        Match m = Regex.Match(RunPowercfg("/getactivescheme"), "[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}");
        return m.Success ? m.Value : "";
    }

    private void SetUltimate(bool on)
    {
        if (on)
        {
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, "ultimate")))
                tweakBackups = SetTrainingMapValue(tweakBackups, "ultimate", ActiveSchemeGuid());
            Match m = Regex.Match(RunPowercfg("-duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61"), "[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}");
            if (m.Success) { ultimateSchemeGuid = m.Value; RunPowercfg("-setactive " + ultimateSchemeGuid); }
        }
        else
        {
            string prev = GetTrainingMapValue(tweakBackups, "ultimate");
            if (!string.IsNullOrEmpty(prev)) RunPowercfg("-setactive " + prev);
            if (!string.IsNullOrEmpty(ultimateSchemeGuid)) { RunPowercfg("-delete " + ultimateSchemeGuid); ultimateSchemeGuid = ""; }
            tweakBackups = SetTrainingMapValue(tweakBackups, "ultimate", "");
        }
    }

    private static System.Collections.Generic.List<string> NetAdapterSubkeys()
    {
        var list = new System.Collections.Generic.List<string>();
        try
        {
            using (var root = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(NetClassPath))
            {
                if (root != null)
                    foreach (string sub in root.GetSubKeyNames())
                        if (sub.Length == 4)
                            using (var k = root.OpenSubKey(sub))
                                if (k != null && k.GetValue("NetCfgInstanceId") != null) list.Add(sub);
            }
        }
        catch { }
        return list;
    }

    private bool NetPowerSavingOff()
    {
        foreach (string sub in NetAdapterSubkeys())
        {
            int? v = RegGetDword(Microsoft.Win32.Registry.LocalMachine, NetClassPath + "\\" + sub, "PnPCapabilities");
            if (v.HasValue && (v.Value & 0x18) != 0) return true;
        }
        return false;
    }

    private void SetNetPowerSaving(bool on)
    {
        if (on)
        {
            if (string.IsNullOrEmpty(GetTrainingMapValue(tweakBackups, "netpower")))
            {
                var parts = new System.Collections.Generic.List<string>();
                foreach (string sub in NetAdapterSubkeys())
                {
                    int? v = RegGetDword(Microsoft.Win32.Registry.LocalMachine, NetClassPath + "\\" + sub, "PnPCapabilities");
                    parts.Add(sub + "=" + (v.HasValue ? v.Value.ToString() : "X"));
                }
                tweakBackups = SetTrainingMapValue(tweakBackups, "netpower", string.Join(",", parts.ToArray()));
            }
            foreach (string sub in NetAdapterSubkeys())
                try { using (var k = Microsoft.Win32.Registry.LocalMachine.CreateSubKey(NetClassPath + "\\" + sub)) { if (k != null) k.SetValue("PnPCapabilities", 24, Microsoft.Win32.RegistryValueKind.DWord); } } catch { }
        }
        else
        {
            string b = GetTrainingMapValue(tweakBackups, "netpower");
            if (!string.IsNullOrEmpty(b))
            {
                foreach (string part in b.Split(','))
                {
                    int eq = part.IndexOf('=');
                    if (eq <= 0) continue;
                    string sub = part.Substring(0, eq);
                    string val = part.Substring(eq + 1);
                    try
                    {
                        using (var k = Microsoft.Win32.Registry.LocalMachine.CreateSubKey(NetClassPath + "\\" + sub))
                        {
                            if (k != null)
                            {
                                if (val == "X") { try { k.DeleteValue("PnPCapabilities", false); } catch { } }
                                else { int vv; if (int.TryParse(val, out vv)) k.SetValue("PnPCapabilities", vv, Microsoft.Win32.RegistryValueKind.DWord); }
                            }
                        }
                    }
                    catch { }
                }
            }
            else
            {
                foreach (string sub in NetAdapterSubkeys())
                    try { using (var k = Microsoft.Win32.Registry.LocalMachine.CreateSubKey(NetClassPath + "\\" + sub)) { if (k != null) { try { k.DeleteValue("PnPCapabilities", false); } catch { } } } } catch { }
            }
            tweakBackups = SetTrainingMapValue(tweakBackups, "netpower", "");
        }
    }

    private bool IsTweakOn(string id)
    {
        try
        {
            switch (id)
            {
                case "inputlag": return RegGetDword(Microsoft.Win32.Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\GraphicsDrivers", "HwSchMode") == 2;
                case "keyboard": return RegGetString(Microsoft.Win32.Registry.CurrentUser, @"Control Panel\Keyboard", "KeyboardDelay") == "0";
                case "perfcounters": return RegGetDword(Microsoft.Win32.Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Perflib", "Disable Performance Counters") == 1;
                case "gamemode": return RegGetDword(Microsoft.Win32.Registry.CurrentUser, @"Software\Microsoft\GameBar", "AutoGameModeEnabled") == 1;
                case "priority": return RegGetDword(Microsoft.Win32.Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\PriorityControl", "Win32PrioritySeparation") == 0x26;
                case "netpower": return NetPowerSavingOff();
                case "gamedvr": return RegGetDword(Microsoft.Win32.Registry.CurrentUser, @"System\GameConfigStore", "GameDVR_Enabled") == 0;
                case "coreparking": return CoreParkingMinCores() == 100;
                case "lastaccess": return FsutilLastAccess() == 1;
                case "superfetch": return ServiceStart("SysMain") == 4;
                case "indexing": return ServiceStart("WSearch") == 4;
                case "ultimate": return !string.IsNullOrEmpty(ultimateSchemeGuid) && ActiveSchemeGuid().Equals(ultimateSchemeGuid, StringComparison.OrdinalIgnoreCase);
            }
        }
        catch { }
        return false;
    }

    private void SetTweak(string id, bool on)
    {
        switch (id)
        {
            case "inputlag": DwordTweak(Microsoft.Win32.Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\GraphicsDrivers", "HwSchMode", 2, on, id); break;
            case "keyboard": StringTweak(Microsoft.Win32.Registry.CurrentUser, @"Control Panel\Keyboard", "KeyboardDelay", "0", on, id); break;
            case "perfcounters": DwordTweak(Microsoft.Win32.Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Perflib", "Disable Performance Counters", 1, on, id); break;
            case "gamemode": DwordTweak(Microsoft.Win32.Registry.CurrentUser, @"Software\Microsoft\GameBar", "AutoGameModeEnabled", 1, on, id); break;
            case "priority": DwordTweak(Microsoft.Win32.Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\PriorityControl", "Win32PrioritySeparation", 0x26, on, id); break;
            case "netpower": SetNetPowerSaving(on); break;
            case "gamedvr": DwordTweak(Microsoft.Win32.Registry.CurrentUser, @"System\GameConfigStore", "GameDVR_Enabled", 0, on, id); break;
            case "coreparking": SetCoreParking(on); break;
            case "lastaccess": SetLastAccess(on); break;
            case "superfetch": SetServiceDisabled("SysMain", on, id); break;
            case "indexing": SetServiceDisabled("WSearch", on, id); break;
            case "ultimate": SetUltimate(on); break;
        }
        SafeUi(delegate { SaveSession(); });
    }

    private void ToggleTweak(string id)
    {
        bool target = !(tweakOn.ContainsKey(id) && tweakOn[id]);
        if (tweakButtons.ContainsKey(id) && tweakButtons[id] != null) tweakButtons[id].Enabled = false;
        System.Threading.Tasks.Task.Run(delegate
        {
            try { SetTweak(id, target); } catch { }
            bool now = false;
            try { now = IsTweakOn(id); } catch { }
            SafeUi(delegate
            {
                tweakOn[id] = now;
                if (tweakButtons.ContainsKey(id) && tweakButtons[id] != null) tweakButtons[id].Enabled = true;
                UpdateTweakButton(id);
                if (now && TweakRebootIds.Contains(id)) ShowToast(T("tweakRebootHint"), 4500);
            });
        });
    }

    private void RefreshTweakStates()
    {
        System.Threading.Tasks.Task.Run(delegate
        {
            var map = new System.Collections.Generic.Dictionary<string, bool>();
            foreach (string id in TweakIds) { try { map[id] = IsTweakOn(id); } catch { map[id] = false; } }
            SafeUi(delegate
            {
                foreach (var kv in map) tweakOn[kv.Key] = kv.Value;
                foreach (string id in TweakIds) UpdateTweakButton(id);
            });
        });
    }

    private void UpdateTweakButton(string id)
    {
        Button b;
        if (!tweakButtons.TryGetValue(id, out b) || b == null) return;
        bool on = tweakOn.ContainsKey(id) && tweakOn[id];
        SetOptionButton(b, on, Theme); // iOS-style switch, identical to the existing cards
        Panel card;
        if (tweakCards.TryGetValue(id, out card) && card != null)
        {
            Label t = NamedLabel(card, "tweakTitle_" + id);
            if (t != null) t.Text = T("tweak_" + id + "_title");
            Label d = NamedLabel(card, "tweakDesc_" + id);
            if (d != null) d.Text = T("tweak_" + id + "_desc");
        }
    }

    private void EnableAllOptimisations()
    {
        overlayShowGames = true;
        overlayShowHighlights = true;
        overlayShowMeta = true;
        overlayShowPerf = true;
        boostFreeRam = true;
        boostPriority = true;
        boostVisualEffects = true;
        if (overlayForm == null || !overlayForm.Visible) ToggleOverlay();
        if (!gameBoostActive) ToggleGameBoost(); // async, won't freeze the UI
        SaveSession();
        RefreshOptimisationOptionsUi();
    }

    private void OnBoostOptionChanged(string option)
    {
        if (gameBoostActive)
        {
            if (option == "ram" && boostFreeRam) TrimBackgroundWorkingSets();
            if (option == "priority")
            {
                if (boostPriority) RaiseGameProcessPriority(); else RestoreGameProcessPriority();
            }
            if (option == "visual")
            {
                if (boostVisualEffects) DisableWindowsUiEffects(); else RestoreWindowsUiEffects();
            }
        }
        SaveSession();
        RefreshOptimisationOptionsUi();
    }

    private void EnableGameBoost()
    {
        if (gameBoostActive) return;
        // The High Performance plan is hidden on some machines; bail out cleanly if absent.
        if (RunPowercfg("/list").IndexOf(HighPerfSchemeGuid, StringComparison.OrdinalIgnoreCase) < 0)
        {
            SafeUi(delegate { ShowToast(T("optimisationBoostUnavailable")); });
            return;
        }
        Match m = Regex.Match(RunPowercfg("/getactivescheme"), "[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}");
        if (!m.Success)
        {
            // Can't read the current plan -> don't switch, to avoid stranding the user on High Performance.
            SafeUi(delegate { ShowToast(T("optimisationBoostUnavailable")); });
            return;
        }
        savedPowerScheme = m.Value;
        RunPowercfg("/setactive " + HighPerfSchemeGuid);
        // Apply the selected extras. Each one captures what it needs to restore on disable/close.
        if (boostVisualEffects) DisableWindowsUiEffects();
        if (boostPriority) RaiseGameProcessPriority();
        if (boostFreeRam) TrimBackgroundWorkingSets();
        gameBoostActive = true;
        SafeUi(delegate { UpdateGameBoostStatus(); });
    }

    private void DisableGameBoost()
    {
        if (!gameBoostActive) return;
        // Fall back to the Balanced plan if the original was somehow never captured.
        string target = string.IsNullOrEmpty(savedPowerScheme) ? "381b4222-f694-41f0-9685-ff5bb260df2e" : savedPowerScheme;
        RunPowercfg("/setactive " + target);
        RestoreGameProcessPriority();
        RestoreWindowsUiEffects();
        gameBoostActive = false;
        SafeUi(delegate { UpdateGameBoostStatus(); });
    }

    private void UpdateGameBoostStatus()
    {
        // gameBoostButton is rendered as a switch by RefreshOptimisationOptionsUi/SetOptionButton.
        if (optimisationBoostStatusLabel != null)
        {
            optimisationBoostStatusLabel.Text = T(gameBoostActive ? "optimisationBoostStatusOn" : "optimisationBoostStatusOff");
            optimisationBoostStatusLabel.ForeColor = gameBoostActive ? Theme.Success : Theme.Muted;
        }
        RefreshOptimisationOptionsUi();
    }

    private void RefreshOptimisationOptionsUi()
    {
        WzTheme th = Theme;
        SetOptionButton(overlayToggleButton, overlayForm != null && overlayForm.Visible, th);
        SetOptionButton(gameBoostButton, gameBoostActive, th);
        SetOptionButton(boostFreeRamButton, boostFreeRam, th);
        SetOptionButton(boostPriorityButton, boostPriority, th);
        SetOptionButton(boostVisualButton, boostVisualEffects, th);
        if (boostFreeRamCheck != null) boostFreeRamCheck.Checked = boostFreeRam;
        if (boostPriorityCheck != null) boostPriorityCheck.Checked = boostPriority;
        if (boostVisualCheck != null) boostVisualCheck.Checked = boostVisualEffects;
    }

    // These card buttons are repainted as iOS-style switches (no "ON/OFF" text):
    // blue track when on, grey when off. The button stays a clickable toggle.
    private void SetOptionButton(Button button, bool enabled, WzTheme theme)
    {
        if (button == null) return;
        Color blend = button.Parent != null ? button.Parent.BackColor : theme.Surface;
        button.Text = "";
        button.Tag = enabled;
        button.Cursor = Cursors.Hand;
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 0;
        button.BackColor = blend;
        button.FlatAppearance.MouseOverBackColor = blend;
        button.FlatAppearance.MouseDownBackColor = blend;
        button.Paint -= OptionSwitchPaint; // avoid stacking handlers across repeated calls
        button.Paint += OptionSwitchPaint;
        button.Invalidate();
    }

    private void OptionSwitchPaint(object sender, PaintEventArgs e)
    {
        Button button = sender as Button;
        if (button == null) return;
        bool on = button.Tag is bool && (bool)button.Tag;
        e.Graphics.Clear(button.Parent != null ? button.Parent.BackColor : button.BackColor);
        int w = 38, h = 20;
        Rectangle r = new Rectangle(button.Width - w - 6, (button.Height - h) / 2, w, h);
        ToggleSwitch.DrawSwitch(e.Graphics, r, on, Theme.Blue, Color.FromArgb(64, 68, 78));
    }

    // Drop transparency/animations for steadier frame pacing; restored verbatim on disable/close.
    private void DisableWindowsUiEffects()
    {
        if (uiEffectsOverridden) return;
        try
        {
            bool current = true;
            SystemParametersInfo(SPI_GETUIEFFECTS, 0, ref current, 0);
            savedUiEffects = current;
            bool off = false;
            SystemParametersInfo(SPI_SETUIEFFECTS, 0, ref off, SPIF_SENDCHANGE);
            uiEffectsOverridden = true;
        }
        catch { /* cosmetic tweak; never block the boost */ }
    }

    private void RestoreWindowsUiEffects()
    {
        if (!uiEffectsOverridden) return;
        try
        {
            bool restore = savedUiEffects;
            SystemParametersInfo(SPI_SETUIEFFECTS, 0, ref restore, SPIF_SENDCHANGE);
        }
        catch { }
        uiEffectsOverridden = false;
    }

    // Bump any running Warzone process to High priority; remember the original class to restore it.
    private void RaiseGameProcessPriority()
    {
        savedGamePriorities.Clear();
        try
        {
            foreach (Process p in Process.GetProcesses())
            {
                try
                {
                    if (!GameProcessNames.Contains(p.ProcessName.ToLowerInvariant())) continue;
                    savedGamePriorities[p.Id] = p.PriorityClass;
                    p.PriorityClass = ProcessPriorityClass.High;
                }
                catch { /* access denied / exited: skip this process */ }
                finally { p.Dispose(); }
            }
        }
        catch { }
    }

    private void RestoreGameProcessPriority()
    {
        foreach (var kv in savedGamePriorities)
        {
            try
            {
                using (Process p = Process.GetProcessById(kv.Key)) p.PriorityClass = kv.Value;
            }
            catch { /* process gone: nothing to restore */ }
        }
        savedGamePriorities.Clear();
    }

    // One-shot: trim background processes' working sets so Warzone has more free RAM at launch.
    private void TrimBackgroundWorkingSets()
    {
        try
        {
            int self = Process.GetCurrentProcess().Id;
            foreach (Process p in Process.GetProcesses())
            {
                try
                {
                    if (p.Id != self) EmptyWorkingSet(p.Handle);
                }
                catch { /* protected/system process: skip */ }
                finally { p.Dispose(); }
            }
        }
        catch { }
    }
}
