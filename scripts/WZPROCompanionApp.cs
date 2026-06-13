using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

public sealed class WzproCompanionApp : Form
{
    private readonly string root;
    private readonly string nodePath;
    private readonly string engineScript;
    private readonly string engineWorkingDirectory;
    private readonly string sessionDir;
    private readonly string sessionPath;
    private readonly string site;
    private readonly HttpClient http = new HttpClient();

    private Process companionProcess;
    private NotifyIcon tray;
    private Timer outputTimer;
    private Timer loginPollTimer;
    private readonly System.Collections.Concurrent.ConcurrentQueue<string> pendingLines = new System.Collections.Concurrent.ConcurrentQueue<string>();

    private Label statusLabel;
    private Label connectionLabel;
    private Button connectButton;
    private Button startButton;
    private Button stopButton;
    private NumericUpDown pollBox;
    private ListBox historyList;
    private TextBox logBox;

    private string deviceToken = "";
    private string connectedName = "";
    private string deviceCode = "";
    private string deviceId = "";
    private bool pollingLogin;
    private bool allowExit;
    private bool minimizeNoticeShown;
    private int historyCount;

    [STAThread]
    public static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new WzproCompanionApp(args));
    }

    public WzproCompanionApp(string[] args)
    {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string bundleNodePath = Path.Combine(exeDir, "runtime", "node.exe");
        string bundleEngineScript = Path.Combine(exeDir, "app", "wzpro-companion.mjs");
        if (File.Exists(bundleNodePath) && File.Exists(bundleEngineScript))
        {
            root = exeDir;
            nodePath = bundleNodePath;
            engineScript = bundleEngineScript;
            engineWorkingDirectory = exeDir;
        }
        else
        {
            root = Path.GetFullPath(Path.Combine(exeDir, "..", ".."));
            nodePath = "node.exe";
            engineScript = Path.Combine(root, "scripts", "wzpro-companion.mjs");
            engineWorkingDirectory = root;
        }
        site = GetArg(args, "-Site") ?? Environment.GetEnvironmentVariable("WZPRO_SITE") ?? "http://localhost:3000";
        site = site.TrimEnd('/');
        sessionDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WZPRO Companion");
        sessionPath = Path.Combine(sessionDir, "session.txt");

        BuildUi();
        BuildTray();
        BuildTimers();
        LoadSession();
        RefreshConnectionUi();
        AddLogLine("Ready. Start when Warzone is open.");
    }

    private static string GetArg(string[] args, string name)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
        }
        return null;
    }

    private void BuildUi()
    {
        Text = "WZPRO Companion";
        Size = new Size(760, 560);
        MinimumSize = new Size(680, 500);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 8, 10);
        ForeColor = Color.White;
        Font = new Font("Consolas", 9);

        var title = Label("WZPRO COMPANION", 20, 18, 360, 32, 18, FontStyle.Bold, Color.White);
        Controls.Add(title);

        Controls.Add(Label("Connecte cette app a ton compte WZPRO, puis laisse-la surveiller Warzone quand tu joues.", 22, 54, 690, 20, 9, FontStyle.Regular, Color.FromArgb(185, 185, 185)));

        statusLabel = Label("Arrete", 22, 78, 460, 24, 10, FontStyle.Bold, Color.FromArgb(185, 185, 185));
        Controls.Add(statusLabel);

        connectionLabel = Label("Non connecte", 22, 118, 320, 24, 10, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        Controls.Add(connectionLabel);

        connectButton = Button("SE CONNECTER A WZPRO", 374, 112, 336, 34, Color.FromArgb(22, 60, 255));
        connectButton.Click += async delegate { await StartLoginFlow(); };
        Controls.Add(connectButton);

        Controls.Add(Label("Verifier toutes", 22, 166, 120, 20, 9, FontStyle.Regular, Color.White));
        pollBox = new NumericUpDown
        {
            Minimum = 3,
            Maximum = 30,
            Increment = 1,
            Value = 5,
            Location = new Point(150, 162),
            Size = new Size(120, 24),
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White
        };
        Controls.Add(pollBox);
        Controls.Add(Label("secondes", 278, 166, 80, 20, 9, FontStyle.Regular, Color.White));

        startButton = Button("START", 374, 160, 120, 30, Color.FromArgb(22, 60, 255));
        startButton.Click += delegate { StartCompanion(); };
        Controls.Add(startButton);

        stopButton = Button("STOP", 506, 160, 120, 30, Color.FromArgb(42, 42, 48));
        stopButton.Enabled = false;
        stopButton.Click += delegate { StopCompanion(); };
        Controls.Add(stopButton);

        Controls.Add(Label("La connexion ouvre ton navigateur. Une fois autorisee sur le site, la cle reste cachee dans cette app.", 22, 198, 690, 34, 9, FontStyle.Regular, Color.FromArgb(150, 150, 155)));

        Controls.Add(Label("Imports", 22, 246, 160, 20, 9, FontStyle.Regular, Color.White));
        historyList = new ListBox
        {
            Location = new Point(22, 270),
            Size = new Size(314, 204),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        Controls.Add(historyList);

        Controls.Add(Label("Journal", 356, 246, 160, 20, 9, FontStyle.Regular, Color.White));
        logBox = new TextBox
        {
            Location = new Point(356, 270),
            Size = new Size(344, 204),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            ReadOnly = true,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.FromArgb(220, 220, 225),
            BorderStyle = BorderStyle.FixedSingle
        };
        Controls.Add(logBox);
    }

    private Label Label(string text, int x, int y, int w, int h, float size, FontStyle style, Color color)
    {
        return new Label
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, h),
            Font = new Font("Consolas", size, style),
            ForeColor = color
        };
    }

    private Button Button(string text, int x, int y, int w, int h, Color color)
    {
        return new Button
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, h),
            BackColor = color,
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Consolas", 8, FontStyle.Bold)
        };
    }

    private void BuildTray()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("Afficher", null, delegate { ShowFromBackground(); });
        menu.Items.Add("Start", null, delegate { StartCompanion(); });
        menu.Items.Add("Stop", null, delegate { StopCompanion(); });
        menu.Items.Add("Fermer totalement", null, delegate { allowExit = true; StopCompanion(); tray.Visible = false; Close(); });

        tray = new NotifyIcon();
        string bundleIconPath = Path.Combine(root, "app", "wzpro-companion.ico");
        string iconPath = File.Exists(bundleIconPath) ? bundleIconPath : Path.Combine(root, "scripts", "wzpro-companion.ico");
        if (File.Exists(iconPath))
        {
            try
            {
                Icon icon = new Icon(iconPath);
                tray.Icon = icon;
                Icon = icon;
            }
            catch
            {
                tray.Icon = SystemIcons.Application;
            }
        }
        else
        {
            tray.Icon = SystemIcons.Application;
        }
        tray.Text = "WZPRO Companion - Stopped";
        tray.Visible = true;
        tray.ContextMenuStrip = menu;
        tray.DoubleClick += delegate { ShowFromBackground(); };
    }

    private void BuildTimers()
    {
        outputTimer = new Timer { Interval = 300 };
        outputTimer.Tick += delegate
        {
            string line;
            while (pendingLines.TryDequeue(out line)) AddLogLine(line);
            if (companionProcess != null && companionProcess.HasExited) SetRunningState(false);
        };
        outputTimer.Start();

        loginPollTimer = new Timer { Interval = 2200 };
        loginPollTimer.Tick += async delegate { await PollLoginFlow(); };

        Resize += delegate
        {
            if (WindowState == FormWindowState.Minimized) HideToBackground();
        };

        FormClosing += delegate(object sender, FormClosingEventArgs e)
        {
            if (!allowExit)
            {
                DialogResult choice = ShowCloseChoice();
                if (choice == DialogResult.OK)
                {
                    allowExit = true;
                    StopCompanion();
                    loginPollTimer.Stop();
                    outputTimer.Stop();
                    tray.Visible = false;
                    tray.Dispose();
                }
                else
                {
                    e.Cancel = true;
                    HideToBackground();
                }
                return;
            }
            StopCompanion();
            loginPollTimer.Stop();
            outputTimer.Stop();
            tray.Visible = false;
            tray.Dispose();
        };
    }

    private void LoadSession()
    {
        try
        {
            if (!File.Exists(sessionPath)) return;
            string text = File.ReadAllText(sessionPath);
            deviceToken = ExtractLine(text, "token");
            connectedName = ExtractLine(text, "userName");
        }
        catch
        {
            deviceToken = "";
            connectedName = "";
        }
    }

    private void SaveSession()
    {
        Directory.CreateDirectory(sessionDir);
        File.WriteAllText(sessionPath, "site=" + site + Environment.NewLine + "token=" + deviceToken + Environment.NewLine + "userName=" + connectedName, Encoding.UTF8);
    }

    private static string ExtractLine(string text, string key)
    {
        foreach (string line in text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
        {
            if (line.StartsWith(key + "=", StringComparison.OrdinalIgnoreCase)) return line.Substring(key.Length + 1).Trim();
        }
        return "";
    }

    private async Task<string> ApiPost(string path, string json)
    {
        using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
        using (HttpResponseMessage response = await http.PostAsync(site + path, content))
        {
            string body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) throw new Exception(body);
            return body;
        }
    }

    private static string JsonEscape(string value)
    {
        return (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    private static string JsonString(string json, string key)
    {
        Match match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"");
        return match.Success ? Regex.Unescape(match.Groups[1].Value) : "";
    }

    private async Task StartLoginFlow()
    {
        if (pollingLogin) return;
        try
        {
            pollingLogin = true;
            connectButton.Enabled = false;
            connectionLabel.Text = "Connexion en cours...";
            connectionLabel.ForeColor = Color.FromArgb(0, 180, 255);
            string deviceName = Environment.MachineName;
            string response = await ApiPost("/api/companion/device/start", "{\"deviceName\":\"" + JsonEscape(deviceName) + "\"}");
            deviceCode = JsonString(response, "code");
            deviceId = JsonString(response, "deviceId");
            string connectUrl = JsonString(response, "connectUrl");
            AddLogLine("Open browser authorization code " + deviceCode);
            Process.Start(connectUrl);
            loginPollTimer.Start();
        }
        catch (Exception ex)
        {
            pollingLogin = false;
            connectButton.Enabled = true;
            connectionLabel.Text = "Connexion impossible";
            connectionLabel.ForeColor = Color.FromArgb(255, 204, 0);
            AddLogLine("Login failed: " + ex.Message);
        }
    }

    private async Task PollLoginFlow()
    {
        if (!pollingLogin || string.IsNullOrWhiteSpace(deviceCode) || string.IsNullOrWhiteSpace(deviceId)) return;
        try
        {
            string response = await ApiPost("/api/companion/device/poll", "{\"code\":\"" + JsonEscape(deviceCode) + "\",\"deviceId\":\"" + JsonEscape(deviceId) + "\"}");
            string status = JsonString(response, "status");
            if (status == "authorized")
            {
                loginPollTimer.Stop();
                pollingLogin = false;
                deviceToken = JsonString(response, "token");
                connectedName = JsonString(response, "userName");
                SaveSession();
                RefreshConnectionUi();
                AddLogLine("Connected to WZPRO as " + connectedName);
            }
            else if (status == "expired")
            {
                loginPollTimer.Stop();
                pollingLogin = false;
                deviceCode = "";
                deviceId = "";
                RefreshConnectionUi();
                AddLogLine("Connection code expired. Start again.");
            }
        }
        catch (Exception ex)
        {
            AddLogLine("Waiting for authorization: " + ex.Message);
        }
    }

    private void RefreshConnectionUi()
    {
        if (!string.IsNullOrWhiteSpace(deviceToken))
        {
            connectionLabel.Text = "Connecte : " + (string.IsNullOrWhiteSpace(connectedName) ? "WZPRO" : connectedName);
            connectionLabel.ForeColor = Color.FromArgb(0, 230, 140);
            connectButton.Text = "RECONNECTER";
            startButton.Enabled = true;
        }
        else
        {
            connectionLabel.Text = "Non connecte";
            connectionLabel.ForeColor = Color.FromArgb(255, 204, 0);
            connectButton.Text = "SE CONNECTER A WZPRO";
            startButton.Enabled = false;
        }
    }

    private void StartCompanion()
    {
        if (companionProcess != null && !companionProcess.HasExited) return;
        if (string.IsNullOrWhiteSpace(deviceToken))
        {
            MessageBox.Show("Connecte d'abord WZPRO Companion a ton compte.", "WZPRO Companion");
            return;
        }

        int pollMs = Math.Max(3000, (int)pollBox.Value * 1000);
        if (!File.Exists(engineScript))
        {
            MessageBox.Show("Moteur WZPRO introuvable.", "WZPRO Companion");
            return;
        }

        statusLabel.Text = "Demarrage...";
        statusLabel.ForeColor = Color.FromArgb(0, 180, 255);
        AddLogLine("Starting companion for " + site);

        var start = new ProcessStartInfo
        {
            FileName = nodePath,
            Arguments = Quote(engineScript) + " --site " + Quote(site) + " --token " + Quote(deviceToken) + " --poll_ms " + pollMs,
            WorkingDirectory = engineWorkingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        companionProcess = new Process { StartInfo = start, EnableRaisingEvents = true };
        companionProcess.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (!string.IsNullOrWhiteSpace(e.Data)) pendingLines.Enqueue(e.Data); };
        companionProcess.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (!string.IsNullOrWhiteSpace(e.Data)) pendingLines.Enqueue(e.Data); };
        companionProcess.Exited += delegate { pendingLines.Enqueue("Companion stopped."); };
        companionProcess.Start();
        companionProcess.BeginOutputReadLine();
        companionProcess.BeginErrorReadLine();
        SetRunningState(true);
    }

    private void StopCompanion()
    {
        if (companionProcess != null && !companionProcess.HasExited)
        {
            AddLogLine("Stopping companion...");
            try
            {
                companionProcess.Kill();
                companionProcess.WaitForExit(2500);
            }
            catch (Exception ex)
            {
                AddLogLine("Stop failed: " + ex.Message);
            }
        }
        SetRunningState(false);
    }

    private void SetRunningState(bool running)
    {
        startButton.Enabled = !running && !string.IsNullOrWhiteSpace(deviceToken);
        stopButton.Enabled = running;
        pollBox.Enabled = !running;
        connectButton.Enabled = !running && !pollingLogin;
        if (!running)
        {
            statusLabel.Text = "Arrete";
            statusLabel.ForeColor = Color.FromArgb(185, 185, 185);
            tray.Text = "WZPRO Companion - Stopped";
        }
    }

    private void AddLogLine(string line)
    {
        if (string.IsNullOrWhiteSpace(line) || logBox == null) return;
        logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + line + Environment.NewLine);
        if (line.Contains("Uploaded game"))
        {
            historyCount++;
            historyList.Items.Insert(0, "Game " + historyCount + " - " + line);
        }
        if (line.Contains("Waiting for Call of Duty"))
        {
            statusLabel.Text = "Warzone non detecte";
            statusLabel.ForeColor = Color.FromArgb(185, 185, 185);
            tray.Text = "WZPRO Companion - Waiting for Warzone";
        }
        else if (line.Contains("waiting for the game window"))
        {
            statusLabel.Text = "Warzone ouvert - active le jeu";
            statusLabel.ForeColor = Color.FromArgb(255, 204, 0);
            tray.Text = "WZPRO Companion - Waiting for focus";
        }
        else if (line.Contains("Watching active game window"))
        {
            statusLabel.Text = "Warzone actif - surveillance";
            statusLabel.ForeColor = Color.FromArgb(0, 180, 255);
            tray.Text = "WZPRO Companion - Watching Warzone";
        }
        else if (line.Contains("Uploaded game"))
        {
            statusLabel.Text = "Game importee";
            statusLabel.ForeColor = Color.FromArgb(0, 230, 140);
            tray.ShowBalloonTip(3500, "WZPRO Companion", line, ToolTipIcon.Info);
        }
        else if (line.Contains("Companion waiting"))
        {
            statusLabel.Text = "En attente";
            statusLabel.ForeColor = Color.FromArgb(255, 204, 0);
        }
    }

    private void HideToBackground()
    {
        WindowState = FormWindowState.Normal;
        ShowInTaskbar = false;
        Hide();
        tray.Visible = true;
        if (!minimizeNoticeShown)
        {
            tray.ShowBalloonTip(3000, "WZprometa", "WZprometa est reduit dans les applications.", ToolTipIcon.Info);
            minimizeNoticeShown = true;
        }
    }

    private void ShowFromBackground()
    {
        ShowInTaskbar = true;
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
    }

    private DialogResult ShowCloseChoice()
    {
        using (var dialog = new Form())
        {
            dialog.Text = "WZprometa";
            dialog.Size = new Size(460, 190);
            dialog.StartPosition = FormStartPosition.CenterParent;
            dialog.FormBorderStyle = FormBorderStyle.FixedDialog;
            dialog.MaximizeBox = false;
            dialog.MinimizeBox = false;
            dialog.BackColor = Color.FromArgb(8, 8, 10);
            dialog.ForeColor = Color.White;
            dialog.Font = new Font("Consolas", 9);
            dialog.Controls.Add(Label("WZprometa est reduit dans les applications.", 22, 24, 400, 42, 9, FontStyle.Regular, Color.FromArgb(235, 235, 235)));
            dialog.Controls.Add(Label("L app peut continuer en arriere-plan. Tu peux aussi fermer totalement l application.", 22, 64, 400, 38, 9, FontStyle.Regular, Color.FromArgb(165, 165, 170)));
            var reduce = Button("REDUIRE", 156, 112, 116, 30, Color.FromArgb(22, 60, 255));
            reduce.DialogResult = DialogResult.Cancel;
            dialog.Controls.Add(reduce);
            var quit = Button("FERMER TOTALEMENT", 282, 112, 140, 30, Color.FromArgb(42, 42, 48));
            quit.DialogResult = DialogResult.OK;
            dialog.Controls.Add(quit);
            dialog.AcceptButton = reduce;
            dialog.CancelButton = reduce;
            return dialog.ShowDialog(this);
        }
    }

    private static string Quote(string value)
    {
        if (string.IsNullOrEmpty(value)) return "\"\"";
        return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }
}
