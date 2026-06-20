using System;
using System.Diagnostics;
using System.Drawing;
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

[assembly: AssemblyTitle("WZPRO Companion")]
[assembly: AssemblyDescription("WZPRO desktop companion for Warzone statistics")]
[assembly: AssemblyCompany("WZPRO Meta")]
[assembly: AssemblyProduct("WZPRO Companion")]
[assembly: AssemblyCopyright("Copyright 2026 WZPRO Meta")]
[assembly: AssemblyVersion("0.1.0.0")]
[assembly: AssemblyFileVersion("0.1.0.0")]

public sealed class WzproCompanionApp : Form
{
    private const string AppVersion = "0.1.0";
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
    private Timer captureTimer;
    private static readonly System.Collections.Generic.HashSet<string> GameProcessNames = new System.Collections.Generic.HashSet<string>
    {
        "cod", "cod22-cod", "cod23-cod", "cod24-cod", "modernwarfare", "modernwarfareii", "modernwarfareiii"
    };
    private static readonly string NativeScreenshotPath = Path.Combine(Path.GetTempPath(), "wzpro-companion-warzone-window.png");

    // Rolling-buffer clip recorder (ffmpeg). Records the focused game window into a
    // circular set of short segments; a highlight saves the recent segments as a clip.
    private string ffmpegPath = "";
    private Process recorderProcess;
    private bool recorderActive;
    private ComboBox clipModeCombo;
    private ComboBox socialFormatCombo;
    private Button musicButton;
    private Label musicLabel;
    private string musicPath = "";
    private Button audioButton;
    private string systemAudioDevice = ""; // dshow device name for game/system audio ("" = none)
    private string micAudioDevice = "";    // dshow device name for the microphone ("" = none)
    private bool recorderAudioDisabled;    // set if audio capture fails and we retry video-only
    private string clipMode = "social";       // social | raw | full | ask
    private string socialFormat = "vertical"; // vertical | square | horizontal
    private readonly System.Collections.Generic.List<string> sessionClips = new System.Collections.Generic.List<string>();
    private readonly System.Collections.Generic.List<string> pendingGameClips = new System.Collections.Generic.List<string>();
    private Form endGameForm;
    private Timer endGameTimer;
    private string pendingUploadedLine = "";
    private int recorderRecipeIndex;
    private DateTime recorderStartedUtc;
    private int noGameTicks;
    private static readonly string BufferDir = Path.Combine(Path.GetTempPath(), "wzpro-companion-buffer");

    // Manual instant-replay global hotkey (Ctrl+Alt+R): saves the rolling buffer on demand,
    // even while the game holds focus in exclusive fullscreen.
    private const int ManualReplayHotkeyId = 0xB001;
    private const uint ModAlt = 0x0001, ModControl = 0x0002, ModShift = 0x0004, ModNoRepeat = 0x4000;
    // Candidate combos tried in order; the first the OS lets us register wins, so a combo
    // already claimed by another app falls back automatically. Deep-modifier combos only —
    // bare Alt+Fn is avoided (Alt+F10 is NVIDIA ShadowPlay's default and F-keys are game-bound).
    private static readonly ReplayHotkey[] ManualReplayCandidates = new ReplayHotkey[]
    {
        new ReplayHotkey(ModControl | ModAlt, 0x52, "Ctrl+Alt+R"),
        new ReplayHotkey(ModControl | ModAlt, 0x78, "Ctrl+Alt+F9"),
        new ReplayHotkey(ModControl | ModShift, 0x78, "Ctrl+Shift+F9"),
    };
    private string activeReplayHotkeyLabel = "";
    private bool manualReplayHotkeyRegistered;
    private bool replayHotkeyToastShown;
    private IntPtr registeredHotkeyHwnd = IntPtr.Zero;
    private DateTime lastManualReplayUtc = DateTime.MinValue;
    private Form toastForm;
    private Timer toastTimer;
    private Font toastFont;

    // Capture + encoder recipes, tried in order (fast-failing ones are skipped at runtime).
    // ddagrab = Desktop Duplication: captures the whole monitor INCLUDING exclusive
    // fullscreen games, GPU-accelerated. gdigrab is the last-resort fallback (windowed only).
    private static readonly string[] CaptureRecipes =
    {
        "-f lavfi -i ddagrab=output_idx=0:framerate=30 -c:v h264_nvenc -preset p4 -tune ll -b:v 12M",
        "-f lavfi -i ddagrab=output_idx=0:framerate=30 -c:v h264_amf -quality speed -usage lowlatency -b:v 12M",
        "-f lavfi -i ddagrab=output_idx=0:framerate=30 -vf hwdownload,format=bgra,format=nv12 -c:v h264_qsv -b:v 12M",
        "-f lavfi -i ddagrab=output_idx=0:framerate=30 -vf hwdownload,format=bgra,format=nv12 -c:v h264_mf -b:v 12M",
        "-f lavfi -i ddagrab=output_idx=0:framerate=30 -vf hwdownload,format=bgra,format=yuv420p,scale='min(1600,iw)':-2 -c:v libx264 -preset ultrafast -tune zerolatency -crf 26",
        "-f gdigrab -framerate 30 -i desktop -vf scale='min(1600,iw)':-2 -c:v libx264 -preset ultrafast -tune zerolatency -crf 26 -pix_fmt yuv420p",
    };
    private readonly System.Collections.Concurrent.ConcurrentQueue<string> pendingLines = new System.Collections.Concurrent.ConcurrentQueue<string>();

    private Label statusLabel;
    private Label connectionLabel;
    private Label titleLabel;
    private Label leadLabel;
    private Label freePageTitleLabel;
    private Label freePageDescLabel;
    private Label premiumPageTitleLabel;
    private Label premiumPageDescLabel;
    private Label hintLabel;
    private Label verifyLabel;
    private Label secondsLabel;
    private Label highlightsTitleLabel;
    private Label highlightsDescLabel;
    private Label highlightsStatusLabel;
    private Label clipsFolderTitleLabel;
    private Label clipsFolderValueLabel;
    private Label premiumCheckoutHintLabel;
    private Label premiumAccessStatusLabel;
    private Label importsLabel;
    private Label journalLabel;
    private Label metaTodayLabel;
    private bool homeFetched;
    private DateTime sessionStartUtc;
    private int sessionGameCount;
    private int sessionHighlightCount;
    private ulong lastIdleTime, lastKernelTime, lastUserTime;
    private int perfCpu = -1, perfRam = -1;
    private Button statsButton;
    private Button gameBarButton;
    private TextBox statsBox;
    private Button overlayButton;
    private Form overlayForm;
    private Label overlayLabel;
    private string metaTodayWeapon = "";
    private Point overlayDragStart;
    private bool overlayDragging;
    private Panel sidebarPanel;
    private Panel mainPanel;
    private Panel welcomePanel;
    private Panel welcomeLoginPanel;
    private Panel freeInfoCard;
    private Panel freeConnectionCard;
    private Panel freeControlsCard;
    private Panel premiumInfoCard;
    private Panel premiumHighlightsCard;
    private Panel premiumClipsCard;
    private Panel premiumAccessCard;
    private Panel premiumAdvancedCard;
    private Panel trainingInfoCard;
    private Panel trainingGoalCard;
    private Panel trainingReviewCard;
    private Panel trainingReadinessCard;
    private Panel trainingHeatmapCard;
    private Panel trainingCategoryCard;
    private Panel trainingModuleCard;
    private Panel profilePanel;
    private PictureBox profilePictureBox;
    private Label profileNameLabel;
    private Label welcomeKickerLabel;
    private Label welcomeTitleLabel;
    private Label welcomeSubtitleLabel;
    private Label welcomeStatsLabel;
    private Label welcomeLoginTitleLabel;
    private Label welcomeLoginStatusLabel;
    private Button connectButton;
    private Button welcomeConnectButton;
    private Button welcomeSiteButton;
    private Button themeButton;
    private Button freeAccessButton;
    private Button premiumButton;
    private Button trainingButton;
    private Button startButton;
    private Button stopButton;
    private Button clipsFolderButton;
    private Button clipsOpenFolderButton;
    private Button premiumCheckoutButton;
    private Button premiumRefreshButton;
    private Button trainingGoalSurviveButton;
    private Button trainingGoalFinishButton;
    private Button trainingGoalRotateButton;
    private Button trainingGoalCommsButton;
    private Button trainingZoneAButton;
    private Button trainingZoneBButton;
    private Button trainingZoneCButton;
    private Button trainingZoneDButton;
    private Button trainingResetButton;
    private Button trainingModuleDoneButton;
    private Button trainingModuleResetButton;
    private CheckBox highlightsToggle;
    private CheckBox trainingDropCheck;
    private CheckBox trainingRotateCheck;
    private CheckBox trainingPushCheck;
    private CheckBox trainingRegainCheck;
    private CheckBox trainingTiltCheck;
    private CheckBox trainingModuleCheck1;
    private CheckBox trainingModuleCheck2;
    private CheckBox trainingModuleCheck3;
    private CheckBox trainingModuleCheck4;
    private CheckBox trainingModuleCheck5;
    private ComboBox languageBox;
    private ComboBox welcomeLanguageBox;
    private NumericUpDown pollBox;
    private ListBox historyList;
    private ListBox trainingCategoryList;
    private TextBox trainingModuleNotesBox;
    private TextBox logBox;
    private ToolStripMenuItem trayShowItem;
    private ToolStripMenuItem trayStartItem;
    private ToolStripMenuItem trayStopItem;
    private ToolStripMenuItem trayQuitItem;
    private ContextMenuStrip profileMenu;
    private ToolStripMenuItem profileSettingsItem;
    private ToolStripMenuItem profileLogoutItem;

    private string deviceToken = "";
    private string connectedName = "";
    private string profilePictureUrl = "";
    private string deviceCode = "";
    private string deviceId = "";
    private string themeMode = "dark";
    private string languageCode = "fr";
    private string activePage = "free";
    private string trainingGoal = "survive";
    private string trainingModuleKey = "death";
    private string trainingModuleStates = "";
    private string trainingModuleNotes = "";
    private int[] trainingZoneRisk = new int[] { 2, 1, 1, 0 };
    private string clipsFolderPath = "";
    private bool highlightsProEnabled;
    private bool updatingLanguageUi;
    private bool updatingTrainingCategoryUi;
    private bool updatingTrainingModuleUi;
    private bool pollingLogin;
    private bool allowExit;
    private bool minimizeNoticeShown;
    private bool premiumAccessActive;
    private bool premiumCheckRunning;
    private DateTime lastPremiumCheckUtc = DateTime.MinValue;
    private Task backgroundPremiumCheck;
    private Task backgroundHome;
    private int historyCount;

    [STAThread]
    public static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.ThreadException += delegate(object sender, System.Threading.ThreadExceptionEventArgs e) { LogCrash(e.Exception); };
        AppDomain.CurrentDomain.UnhandledException += delegate(object sender, UnhandledExceptionEventArgs e) { LogCrash(e.ExceptionObject as Exception); };
        Application.Run(new WzproCompanionApp(args));
    }

    public WzproCompanionApp(string[] args)
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
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
        site = GetArg(args, "-Site") ?? Environment.GetEnvironmentVariable("WZPRO_SITE") ?? "https://wzprometa.com";
        site = site.TrimEnd('/');
        sessionDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WZPRO Companion");
        sessionPath = Path.Combine(sessionDir, "session.txt");

        BuildUi();
        BuildTray();
        BuildTimers();
        LoadSession();
        ApplyTheme();
        ApplyLanguage();
        RefreshConnectionUi();
        if (string.IsNullOrWhiteSpace(deviceToken)) ShowWelcome();
        else ShowAppShell();
        AddLogLine(T("ready"));
        AddLogLine(T("site") + site);
        if (!string.IsNullOrWhiteSpace(deviceToken)) backgroundHome = FetchHomeData();
    }

    private Font AppFont(float size, FontStyle style)
    {
        // Match the website's technical monospace stack (readable), not the display font.
        foreach (string name in new[] { "Cascadia Mono", "Cascadia Code", "Consolas" })
        {
            try
            {
                var f = new Font(name, size, style);
                if (string.Equals(f.Name, name, StringComparison.OrdinalIgnoreCase)) return f;
                f.Dispose();
            }
            catch { }
        }
        return new Font(FontFamily.GenericMonospace, size, style);
    }

    private static string GetArg(string[] args, string name)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
        }
        return null;
    }

    private static void LogCrash(Exception ex)
    {
        try
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WZPRO Companion");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, "crash.log");
            string body = "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] " + (ex == null ? "Unknown crash" : ex.ToString());
            File.AppendAllText(path, body + Environment.NewLine + Environment.NewLine, Encoding.UTF8);
        }
        catch
        {
            // Crash logging must never trigger another crash.
        }
    }

    private void BuildUi()
    {
        Text = "WZPRO Companion v" + AppVersion;
        Size = new Size(980, 680);
        MinimumSize = new Size(920, 640);
        StartPosition = FormStartPosition.CenterScreen;
        Font = AppFont(9, FontStyle.Regular);

        welcomePanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(980, 680),
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
        };
        Controls.Add(welcomePanel);

        welcomeLanguageBox = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Location = new Point(78, 58),
            Size = new Size(220, 34),
            Font = AppFont(8, FontStyle.Bold)
        };
        welcomeLanguageBox.Items.AddRange(new object[] { "FR", "EN", "ES" });
        welcomeLanguageBox.SelectedIndexChanged += delegate { OnWelcomeLanguageChanged(); };
        welcomePanel.Controls.Add(welcomeLanguageBox);

        welcomeKickerLabel = Label("", 78, 138, 270, 34, 9, FontStyle.Bold, Color.White);
        welcomePanel.Controls.Add(welcomeKickerLabel);

        welcomeTitleLabel = Label("", 78, 210, 500, 150, 22, FontStyle.Bold, Color.White);
        welcomePanel.Controls.Add(welcomeTitleLabel);

        welcomeSubtitleLabel = Label("", 78, 350, 430, 70, 12, FontStyle.Regular, Color.White);
        welcomeSubtitleLabel.Visible = false;
        welcomePanel.Controls.Add(welcomeSubtitleLabel);

        welcomeStatsLabel = Label("", 78, 470, 500, 58, 10, FontStyle.Bold, Color.White);
        welcomePanel.Controls.Add(welcomeStatsLabel);

        welcomeLoginPanel = new Panel
        {
            Location = new Point(666, 156),
            Size = new Size(274, 330),
            Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        welcomePanel.Controls.Add(welcomeLoginPanel);

        welcomeLoginTitleLabel = Label("", 24, 34, 226, 60, 17, FontStyle.Bold, Color.White);
        welcomeLoginTitleLabel.TextAlign = ContentAlignment.MiddleCenter;
        welcomeLoginPanel.Controls.Add(welcomeLoginTitleLabel);

        welcomeConnectButton = Button("", 32, 122, 210, 44, Color.FromArgb(22, 60, 255));
        welcomeConnectButton.Click += async delegate { await StartLoginFlow(); };
        welcomeLoginPanel.Controls.Add(welcomeConnectButton);

        welcomeSiteButton = Button("", 32, 180, 210, 38, Color.FromArgb(42, 42, 48));
        welcomeSiteButton.Click += delegate { OpenUrl(site); };
        welcomeLoginPanel.Controls.Add(welcomeSiteButton);

        welcomeLoginStatusLabel = Label("", 30, 246, 214, 52, 8, FontStyle.Regular, Color.White);
        welcomeLoginStatusLabel.TextAlign = ContentAlignment.TopCenter;
        welcomeLoginPanel.Controls.Add(welcomeLoginStatusLabel);

        sidebarPanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(220, 680),
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left
        };
        Controls.Add(sidebarPanel);

        mainPanel = new Panel
        {
            Location = new Point(220, 0),
            Size = new Size(760, 680),
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
        };
        Controls.Add(mainPanel);

        titleLabel = Label("WZPRO", 22, 22, 176, 34, 18, FontStyle.Bold, Color.White);
        sidebarPanel.Controls.Add(titleLabel);

        leadLabel = Label("", 34, 30, 360, 46, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        leadLabel.Visible = false;
        mainPanel.Controls.Add(leadLabel);

        freeAccessButton = Button("", 16, 92, 188, 44, Color.FromArgb(22, 60, 255));
        freeAccessButton.Click += delegate { ShowPage("free"); };
        sidebarPanel.Controls.Add(freeAccessButton);

        premiumButton = Button("", 16, 146, 188, 44, Color.FromArgb(42, 42, 48));
        premiumButton.Click += delegate { ShowPage("premium"); };
        sidebarPanel.Controls.Add(premiumButton);

        trainingButton = Button("", 16, 200, 188, 44, Color.FromArgb(42, 42, 48));
        trainingButton.Click += delegate { ShowPage("training"); };
        sidebarPanel.Controls.Add(trainingButton);

        profilePanel = new Panel
        {
            Location = new Point(16, 500),
            Size = new Size(188, 96),
            Anchor = AnchorStyles.Left | AnchorStyles.Bottom,
            Cursor = Cursors.Hand
        };
        profilePanel.Click += delegate { ShowProfileMenu(); };
        sidebarPanel.Controls.Add(profilePanel);

        profilePictureBox = new PictureBox
        {
            Location = new Point(74, 8),
            Size = new Size(42, 42),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent,
            Cursor = Cursors.Hand
        };
        profilePictureBox.Click += delegate { ShowProfileMenu(); };
        profilePanel.Controls.Add(profilePictureBox);

        profileNameLabel = Label("", 8, 56, 172, 30, 8, FontStyle.Bold, Color.White);
        profileNameLabel.TextAlign = ContentAlignment.TopCenter;
        profileNameLabel.Cursor = Cursors.Hand;
        profileNameLabel.Click += delegate { ShowProfileMenu(); };
        profilePanel.Controls.Add(profileNameLabel);

        profileMenu = new ContextMenuStrip();
        profileSettingsItem = new ToolStripMenuItem("", null, delegate { OpenProfileSettings(); });
        profileLogoutItem = new ToolStripMenuItem("", null, delegate { LogoutProfile(); });
        profileMenu.Items.Add(profileSettingsItem);
        profileMenu.Items.Add(profileLogoutItem);

        languageBox = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Location = new Point(34, 26),
            Size = new Size(88, 28),
            Font = AppFont(8, FontStyle.Bold)
        };
        languageBox.Items.AddRange(new object[] { "FR", "EN", "ES" });
        languageBox.SelectedIndexChanged += delegate { OnLanguageChanged(); };
        mainPanel.Controls.Add(languageBox);

        themeButton = Button("MODE CLAIR", 608, 24, 116, 28, Color.FromArgb(22, 60, 255));
        themeButton.Click += delegate { ToggleTheme(); };
        mainPanel.Controls.Add(themeButton);

        overlayButton = Button("", 466, 24, 132, 28, Color.FromArgb(42, 42, 48));
        overlayButton.Click += delegate { ToggleOverlay(); };
        mainPanel.Controls.Add(overlayButton);

        gameBarButton = Button("", 300, 24, 158, 28, Color.FromArgb(22, 60, 255));
        gameBarButton.Click += delegate { OpenUrl("ms-settings:gaming-gamebar"); };
        mainPanel.Controls.Add(gameBarButton);

        freeInfoCard = new Panel
        {
            Location = new Point(34, 92),
            Size = new Size(690, 126),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(freeInfoCard);

        freePageTitleLabel = Label("", 24, 22, 420, 32, 16, FontStyle.Bold, Color.White);
        freeInfoCard.Controls.Add(freePageTitleLabel);

        freePageDescLabel = Label("", 24, 64, 620, 36, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        freeInfoCard.Controls.Add(freePageDescLabel);

        metaTodayLabel = Label("", 24, 100, 640, 20, 9, FontStyle.Bold, Color.FromArgb(120, 150, 255));
        freeInfoCard.Controls.Add(metaTodayLabel);

        freeConnectionCard = new Panel
        {
            Location = new Point(34, 238),
            Size = new Size(690, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(freeConnectionCard);

        statusLabel = Label("", 24, 18, 260, 24, 10, FontStyle.Bold, Color.FromArgb(185, 185, 185));
        freeConnectionCard.Controls.Add(statusLabel);

        connectionLabel = Label("", 24, 58, 360, 24, 9, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        freeConnectionCard.Controls.Add(connectionLabel);

        connectButton = Button("", 440, 34, 220, 38, Color.FromArgb(22, 60, 255));
        connectButton.Click += async delegate { await StartLoginFlow(); };
        freeConnectionCard.Controls.Add(connectButton);

        freeControlsCard = new Panel
        {
            Location = new Point(34, 364),
            Size = new Size(690, 112),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(freeControlsCard);

        verifyLabel = Label("", 24, 20, 120, 20, 8, FontStyle.Regular, Color.White);
        freeControlsCard.Controls.Add(verifyLabel);
        pollBox = new NumericUpDown
        {
            Minimum = 3,
            Maximum = 30,
            Increment = 1,
            Value = 5,
            Location = new Point(154, 16),
            Size = new Size(120, 24),
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White
        };
        freeControlsCard.Controls.Add(pollBox);
        secondsLabel = Label("", 286, 20, 90, 20, 8, FontStyle.Regular, Color.White);
        freeControlsCard.Controls.Add(secondsLabel);

        startButton = Button("", 470, 14, 82, 34, Color.FromArgb(22, 60, 255));
        startButton.Click += delegate { StartCompanion(); };
        freeControlsCard.Controls.Add(startButton);

        stopButton = Button("", 566, 14, 82, 34, Color.FromArgb(42, 42, 48));
        stopButton.Enabled = false;
        stopButton.Click += delegate { StopCompanion(); };
        freeControlsCard.Controls.Add(stopButton);

        hintLabel = Label("", 24, 66, 620, 34, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        freeControlsCard.Controls.Add(hintLabel);

        premiumInfoCard = new Panel
        {
            Location = new Point(34, 92),
            Size = new Size(690, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(premiumInfoCard);

        premiumPageTitleLabel = Label("", 24, 20, 420, 32, 16, FontStyle.Bold, Color.White);
        premiumInfoCard.Controls.Add(premiumPageTitleLabel);

        premiumPageDescLabel = Label("", 24, 58, 620, 36, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        premiumInfoCard.Controls.Add(premiumPageDescLabel);

        premiumHighlightsCard = new Panel
        {
            Location = new Point(34, 218),
            Size = new Size(690, 126),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(premiumHighlightsCard);

        highlightsTitleLabel = Label("", 24, 18, 210, 22, 10, FontStyle.Bold, Color.White);
        premiumHighlightsCard.Controls.Add(highlightsTitleLabel);

        highlightsToggle = new CheckBox
        {
            Location = new Point(426, 16),
            Size = new Size(238, 28),
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold),
            ForeColor = Color.White
        };
        highlightsToggle.CheckedChanged += delegate { OnHighlightsChanged(); };
        premiumHighlightsCard.Controls.Add(highlightsToggle);

        highlightsDescLabel = Label("", 24, 52, 640, 42, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        premiumHighlightsCard.Controls.Add(highlightsDescLabel);

        highlightsStatusLabel = Label("", 24, 96, 640, 22, 8, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        premiumHighlightsCard.Controls.Add(highlightsStatusLabel);

        premiumClipsCard = new Panel
        {
            Location = new Point(34, 360),
            Size = new Size(690, 94),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(premiumClipsCard);

        clipsFolderTitleLabel = Label("", 24, 16, 260, 22, 10, FontStyle.Bold, Color.White);
        premiumClipsCard.Controls.Add(clipsFolderTitleLabel);

        clipsFolderValueLabel = Label("", 24, 46, 444, 36, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        premiumClipsCard.Controls.Add(clipsFolderValueLabel);

        clipsFolderButton = Button("", 500, 42, 82, 34, Color.FromArgb(22, 60, 255));
        clipsFolderButton.Click += delegate { ChooseClipsFolder(); };
        premiumClipsCard.Controls.Add(clipsFolderButton);

        clipsOpenFolderButton = Button("", 592, 42, 74, 34, Color.FromArgb(42, 42, 48));
        clipsOpenFolderButton.Click += delegate { OpenClipsFolder(); };
        premiumClipsCard.Controls.Add(clipsOpenFolderButton);

        premiumAccessCard = new Panel
        {
            Location = new Point(34, 470),
            Size = new Size(690, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(premiumAccessCard);

        premiumCheckoutHintLabel = Label("", 24, 16, 344, 38, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        premiumAccessCard.Controls.Add(premiumCheckoutHintLabel);

        premiumAccessStatusLabel = Label("", 24, 62, 344, 34, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        premiumAccessCard.Controls.Add(premiumAccessStatusLabel);

        premiumCheckoutButton = Button("", 380, 16, 286, 38, Color.FromArgb(22, 60, 255));
        premiumCheckoutButton.Click += delegate { OpenPremiumAccessPage(); };
        premiumAccessCard.Controls.Add(premiumCheckoutButton);

        premiumRefreshButton = Button("", 380, 62, 286, 34, Color.FromArgb(42, 42, 48));
        premiumRefreshButton.Click += async delegate { await CheckPremiumAccess(true); };
        premiumAccessCard.Controls.Add(premiumRefreshButton);

        premiumAdvancedCard = new Panel
        {
            Location = new Point(34, 586),
            Size = new Size(690, 96),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(premiumAdvancedCard);

        statsButton = Button("", 12, 10, 200, 32, Color.FromArgb(22, 60, 255));
        statsButton.Click += async delegate { await FetchStats(); };
        premiumAdvancedCard.Controls.Add(statsButton);

        statsBox = new TextBox
        {
            Location = new Point(222, 8),
            Size = new Size(456, 76),
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        premiumAdvancedCard.Controls.Add(statsBox);

        clipModeCombo = new ComboBox
        {
            Location = new Point(12, 48),
            Size = new Size(210, 24),
            DropDownStyle = ComboBoxStyle.DropDownList,
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold)
        };
        clipModeCombo.SelectedIndexChanged += delegate { OnClipModeChanged(); };
        premiumAdvancedCard.Controls.Add(clipModeCombo);

        socialFormatCombo = new ComboBox
        {
            Location = new Point(12, 74),
            Size = new Size(210, 24),
            DropDownStyle = ComboBoxStyle.DropDownList,
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold)
        };
        socialFormatCombo.SelectedIndexChanged += delegate { OnSocialFormatChanged(); };
        premiumAdvancedCard.Controls.Add(socialFormatCombo);

        musicButton = Button("", 222, 58, 136, 24, Color.FromArgb(42, 42, 48));
        musicButton.Click += delegate { ChooseMusic(); };
        premiumAdvancedCard.Controls.Add(musicButton);

        musicLabel = Label("", 368, 62, 144, 16, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        premiumAdvancedCard.Controls.Add(musicLabel);

        audioButton = Button("", 522, 58, 156, 24, Color.FromArgb(42, 42, 48));
        audioButton.Click += delegate { OpenAudioSettings(); };
        premiumAdvancedCard.Controls.Add(audioButton);

        trainingInfoCard = new Panel
        {
            Location = new Point(34, 92),
            Size = new Size(690, 90),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingInfoCard);

        var trainingPageTitleLabel = Label("", 24, 18, 430, 30, 16, FontStyle.Bold, Color.White);
        trainingPageTitleLabel.Name = "trainingPageTitleLabel";
        trainingInfoCard.Controls.Add(trainingPageTitleLabel);

        var trainingPageDescLabel = Label("", 24, 54, 620, 28, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        trainingPageDescLabel.Name = "trainingPageDescLabel";
        trainingInfoCard.Controls.Add(trainingPageDescLabel);

        trainingGoalCard = new Panel
        {
            Location = new Point(34, 198),
            Size = new Size(690, 126),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingGoalCard);

        var trainingGoalTitleLabel = Label("", 24, 18, 300, 22, 10, FontStyle.Bold, Color.White);
        trainingGoalTitleLabel.Name = "trainingGoalTitleLabel";
        trainingGoalCard.Controls.Add(trainingGoalTitleLabel);

        var trainingGoalDescLabel = Label("", 24, 48, 620, 26, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        trainingGoalDescLabel.Name = "trainingGoalDescLabel";
        trainingGoalCard.Controls.Add(trainingGoalDescLabel);

        trainingGoalSurviveButton = Button("", 24, 82, 150, 30, Color.FromArgb(22, 60, 255));
        trainingGoalSurviveButton.Click += delegate { SetTrainingGoal("survive"); };
        trainingGoalCard.Controls.Add(trainingGoalSurviveButton);

        trainingGoalFinishButton = Button("", 184, 82, 150, 30, Color.FromArgb(42, 42, 48));
        trainingGoalFinishButton.Click += delegate { SetTrainingGoal("finish"); };
        trainingGoalCard.Controls.Add(trainingGoalFinishButton);

        trainingGoalRotateButton = Button("", 344, 82, 150, 30, Color.FromArgb(42, 42, 48));
        trainingGoalRotateButton.Click += delegate { SetTrainingGoal("rotate"); };
        trainingGoalCard.Controls.Add(trainingGoalRotateButton);

        trainingGoalCommsButton = Button("", 504, 82, 150, 30, Color.FromArgb(42, 42, 48));
        trainingGoalCommsButton.Click += delegate { SetTrainingGoal("comms"); };
        trainingGoalCard.Controls.Add(trainingGoalCommsButton);

        trainingCategoryCard = new Panel
        {
            Location = new Point(34, 340),
            Size = new Size(220, 300),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingCategoryCard);

        var trainingCategoryTitleLabel = Label("", 16, 14, 180, 22, 10, FontStyle.Bold, Color.White);
        trainingCategoryTitleLabel.Name = "trainingCategoryTitleLabel";
        trainingCategoryCard.Controls.Add(trainingCategoryTitleLabel);

        trainingCategoryList = new ListBox
        {
            Location = new Point(14, 44),
            Size = new Size(192, 238),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle,
            Font = AppFont(8, FontStyle.Regular)
        };
        trainingCategoryList.SelectedIndexChanged += delegate { OnTrainingCategoryChanged(); };
        trainingCategoryCard.Controls.Add(trainingCategoryList);

        trainingModuleCard = new Panel
        {
            Location = new Point(268, 340),
            Size = new Size(456, 300),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingModuleCard);

        var trainingModuleTitleLabel = Label("", 18, 14, 390, 22, 10, FontStyle.Bold, Color.White);
        trainingModuleTitleLabel.Name = "trainingModuleTitleLabel";
        trainingModuleCard.Controls.Add(trainingModuleTitleLabel);

        var trainingModuleDescLabel = Label("", 18, 40, 410, 42, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        trainingModuleDescLabel.Name = "trainingModuleDescLabel";
        trainingModuleCard.Controls.Add(trainingModuleDescLabel);

        trainingModuleCheck1 = TrainingCheckBox(18, 88);
        trainingModuleCheck2 = TrainingCheckBox(18, 112);
        trainingModuleCheck3 = TrainingCheckBox(18, 136);
        trainingModuleCheck4 = TrainingCheckBox(18, 160);
        trainingModuleCheck5 = TrainingCheckBox(18, 184);
        trainingModuleCard.Controls.Add(trainingModuleCheck1);
        trainingModuleCard.Controls.Add(trainingModuleCheck2);
        trainingModuleCard.Controls.Add(trainingModuleCheck3);
        trainingModuleCard.Controls.Add(trainingModuleCheck4);
        trainingModuleCard.Controls.Add(trainingModuleCheck5);

        var trainingModuleNotesLabel = Label("", 18, 212, 90, 18, 8, FontStyle.Bold, Color.White);
        trainingModuleNotesLabel.Name = "trainingModuleNotesLabel";
        trainingModuleCard.Controls.Add(trainingModuleNotesLabel);

        trainingModuleNotesBox = new TextBox
        {
            Location = new Point(110, 208),
            Size = new Size(196, 56),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle,
            Font = AppFont(8, FontStyle.Regular)
        };
        trainingModuleNotesBox.TextChanged += delegate { OnTrainingModuleNotesChanged(); };
        trainingModuleCard.Controls.Add(trainingModuleNotesBox);

        trainingModuleDoneButton = Button("", 318, 208, 116, 28, Color.FromArgb(22, 60, 255));
        trainingModuleDoneButton.Click += delegate { MarkTrainingModuleDone(); };
        trainingModuleCard.Controls.Add(trainingModuleDoneButton);

        trainingModuleResetButton = Button("", 318, 244, 116, 28, Color.FromArgb(42, 42, 48));
        trainingModuleResetButton.Click += delegate { ResetTrainingModule(); };
        trainingModuleCard.Controls.Add(trainingModuleResetButton);

        var trainingModuleStatusLabel = Label("", 18, 274, 410, 18, 8, FontStyle.Bold, Color.FromArgb(120, 150, 255));
        trainingModuleStatusLabel.Name = "trainingModuleStatusLabel";
        trainingModuleCard.Controls.Add(trainingModuleStatusLabel);

        trainingReviewCard = new Panel
        {
            Location = new Point(34, 340),
            Size = new Size(330, 160),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingReviewCard);

        var trainingReviewTitleLabel = Label("", 20, 14, 250, 22, 10, FontStyle.Bold, Color.White);
        trainingReviewTitleLabel.Name = "trainingReviewTitleLabel";
        trainingReviewCard.Controls.Add(trainingReviewTitleLabel);

        trainingDropCheck = TrainingCheckBox(20, 44);
        trainingRotateCheck = TrainingCheckBox(20, 66);
        trainingPushCheck = TrainingCheckBox(20, 88);
        trainingRegainCheck = TrainingCheckBox(20, 110);
        trainingTiltCheck = TrainingCheckBox(20, 132);
        trainingReviewCard.Controls.Add(trainingDropCheck);
        trainingReviewCard.Controls.Add(trainingRotateCheck);
        trainingReviewCard.Controls.Add(trainingPushCheck);
        trainingReviewCard.Controls.Add(trainingRegainCheck);
        trainingReviewCard.Controls.Add(trainingTiltCheck);

        trainingReadinessCard = new Panel
        {
            Location = new Point(388, 340),
            Size = new Size(336, 160),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingReadinessCard);

        var trainingReadinessTitleLabel = Label("", 20, 14, 250, 22, 10, FontStyle.Bold, Color.White);
        trainingReadinessTitleLabel.Name = "trainingReadinessTitleLabel";
        trainingReadinessCard.Controls.Add(trainingReadinessTitleLabel);

        var trainingReadinessValueLabel = Label("", 20, 48, 150, 42, 22, FontStyle.Bold, Color.FromArgb(120, 150, 255));
        trainingReadinessValueLabel.Name = "trainingReadinessValueLabel";
        trainingReadinessCard.Controls.Add(trainingReadinessValueLabel);

        var trainingReadinessDescLabel = Label("", 20, 96, 286, 48, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        trainingReadinessDescLabel.Name = "trainingReadinessDescLabel";
        trainingReadinessCard.Controls.Add(trainingReadinessDescLabel);

        trainingHeatmapCard = new Panel
        {
            Location = new Point(34, 516),
            Size = new Size(690, 124),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingHeatmapCard);

        var trainingHeatmapTitleLabel = Label("", 24, 14, 300, 22, 10, FontStyle.Bold, Color.White);
        trainingHeatmapTitleLabel.Name = "trainingHeatmapTitleLabel";
        trainingHeatmapCard.Controls.Add(trainingHeatmapTitleLabel);

        var trainingHeatmapDescLabel = Label("", 24, 42, 620, 22, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        trainingHeatmapDescLabel.Name = "trainingHeatmapDescLabel";
        trainingHeatmapCard.Controls.Add(trainingHeatmapDescLabel);

        trainingZoneAButton = Button("", 24, 78, 122, 30, Color.FromArgb(42, 42, 48));
        trainingZoneAButton.Click += delegate { CycleTrainingZone(0); };
        trainingHeatmapCard.Controls.Add(trainingZoneAButton);
        trainingZoneBButton = Button("", 154, 78, 122, 30, Color.FromArgb(42, 42, 48));
        trainingZoneBButton.Click += delegate { CycleTrainingZone(1); };
        trainingHeatmapCard.Controls.Add(trainingZoneBButton);
        trainingZoneCButton = Button("", 284, 78, 122, 30, Color.FromArgb(42, 42, 48));
        trainingZoneCButton.Click += delegate { CycleTrainingZone(2); };
        trainingHeatmapCard.Controls.Add(trainingZoneCButton);
        trainingZoneDButton = Button("", 414, 78, 122, 30, Color.FromArgb(42, 42, 48));
        trainingZoneDButton.Click += delegate { CycleTrainingZone(3); };
        trainingHeatmapCard.Controls.Add(trainingZoneDButton);
        trainingResetButton = Button("", 554, 78, 112, 30, Color.FromArgb(42, 42, 48));
        trainingResetButton.Click += delegate { ResetTrainingLab(); };
        trainingHeatmapCard.Controls.Add(trainingResetButton);

        importsLabel = Label("", 34, 492, 160, 20, 9, FontStyle.Bold, Color.White);
        mainPanel.Controls.Add(importsLabel);
        historyList = new ListBox
        {
            Location = new Point(34, 516),
            Size = new Size(330, 56),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(historyList);

        journalLabel = Label("", 388, 492, 160, 20, 9, FontStyle.Bold, Color.White);
        mainPanel.Controls.Add(journalLabel);
        logBox = new TextBox
        {
            Location = new Point(388, 516),
            Size = new Size(330, 56),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            ReadOnly = true,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.FromArgb(220, 220, 225),
            Font = AppFont(8, FontStyle.Regular),
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(logBox);
    }

    private Label Label(string text, int x, int y, int w, int h, float size, FontStyle style, Color color)
    {
        return new Label
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, h),
            Font = AppFont(size, style),
            ForeColor = color
        };
    }

    private Button Button(string text, int x, int y, int w, int h, Color color)
    {
        var button = new Button
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, h),
            BackColor = color,
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold)
        };
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = color;
        button.FlatAppearance.MouseOverBackColor = color;
        button.FlatAppearance.MouseDownBackColor = ControlPaint.Dark(color);
        return button;
    }

    private CheckBox TrainingCheckBox(int x, int y)
    {
        var checkBox = new CheckBox
        {
            Location = new Point(x, y),
            Size = new Size(286, 22),
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Regular),
            ForeColor = Color.White,
            BackColor = Color.Transparent
        };
        checkBox.CheckedChanged += delegate
        {
            if (updatingTrainingModuleUi) return;
            SaveCurrentTrainingModuleState();
            RefreshTrainingUi();
            SaveSession();
        };
        return checkBox;
    }

    private Label NamedLabel(Control parent, string name)
    {
        if (parent == null) return null;
        Control[] controls = parent.Controls.Find(name, true);
        return controls.Length > 0 ? controls[0] as Label : null;
    }

    private sealed class WzTheme
    {
        public Color Canvas;
        public Color Surface;
        public Color SurfaceAlt;
        public Color Ink;
        public Color Muted;
        public Color Line;
        public Color Blue;
        public Color BlueText;
        public Color Warn;
        public Color Success;
        public Color Info;

        public static WzTheme Dark()
        {
            return new WzTheme
            {
                Canvas = Color.FromArgb(5, 5, 6),
                Surface = Color.FromArgb(16, 16, 14),
                SurfaceAlt = Color.FromArgb(22, 22, 24),
                Ink = Color.FromArgb(243, 246, 239),
                Muted = Color.FromArgb(184, 186, 178),
                Line = Color.FromArgb(22, 60, 255),
                Blue = Color.FromArgb(22, 60, 255),
                BlueText = Color.FromArgb(239, 238, 232),
                Warn = Color.FromArgb(255, 204, 0),
                Success = Color.FromArgb(0, 230, 140),
                Info = Color.FromArgb(0, 180, 255)
            };
        }

        public static WzTheme Light()
        {
            return new WzTheme
            {
                Canvas = Color.FromArgb(239, 238, 232),
                Surface = Color.FromArgb(250, 247, 239),
                SurfaceAlt = Color.FromArgb(231, 229, 220),
                Ink = Color.FromArgb(16, 16, 14),
                Muted = Color.FromArgb(92, 90, 84),
                Line = Color.FromArgb(202, 199, 188),
                Blue = Color.FromArgb(22, 60, 255),
                BlueText = Color.FromArgb(239, 238, 232),
                Warn = Color.FromArgb(153, 112, 0),
                Success = Color.FromArgb(0, 120, 76),
                Info = Color.FromArgb(22, 60, 255)
            };
        }
    }

    private WzTheme Theme
    {
        get { return themeMode == "light" ? WzTheme.Light() : WzTheme.Dark(); }
    }

    private string T(string key)
    {
        if (languageCode == "en")
        {
            switch (key)
            {
                case "title": return "WZPRO COMPANION";
                case "lead": return "";
                case "themeLight": return "LIGHT MODE";
                case "themeDark": return "DARK MODE";
                case "freeAccess": return "FREE ACCESS";
                case "premiumAccess": return "PREMIUM";
                case "freePageTitle": return "Free performance tracker";
                case "freePageDesc": return "Connect WZPRO, launch Warzone and let Companion import your end-game stats automatically.";
                case "premiumPageTitle": return "Premium access";
                case "premiumPageDesc": return "Optional paid modules for players who want clips, review tools and richer automation inside the same app.";
                case "trainingAccess": return "TRAINING LAB";
                case "trainingPageTitle": return "Training Lab";
                case "trainingPageDesc": return "Set a session focus, review weak decisions and keep risky map zones visible before queueing.";
                case "trainingGoalTitle": return "Session focus";
                case "trainingGoalDesc": return "Pick one clear behavior to protect for the next games.";
                case "trainingGoalSurvive": return "SURVIVE";
                case "trainingGoalFinish": return "FINISH";
                case "trainingGoalRotate": return "ROTATE";
                case "trainingGoalComms": return "COMMS";
                case "trainingCategoriesTitle": return "Training categories";
                case "trainingModuleNotes": return "Notes";
                case "trainingModuleDone": return "DONE";
                case "trainingModuleProgress": return "Progress ";
                case "trainingModuleScore": return "Score ";
                case "trainingReviewTitle": return "Decision review";
                case "trainingReviewDrop": return "Dropped too hot";
                case "trainingReviewRotate": return "Late rotation";
                case "trainingReviewPush": return "Bad push timing";
                case "trainingReviewRegain": return "Weak regain plan";
                case "trainingReviewTilt": return "Tilt / autopilot";
                case "trainingReadinessTitle": return "Readiness";
                case "trainingReady": return "Ready to queue. Keep the selected focus visible and play the first circle clean.";
                case "trainingWarmup": return "Warm up first. Clear two review items before pushing ranked tempo.";
                case "trainingResetHint": return "Reset the session: calmer drop, earlier rotation, simpler fights.";
                case "trainingHeatmapTitle": return "Risk zones";
                case "trainingHeatmapDesc": return "Click each zone to cycle low, medium or high risk for tonight's plan.";
                case "trainingZoneLow": return "LOW";
                case "trainingZoneMedium": return "MED";
                case "trainingZoneHigh": return "HIGH";
                case "trainingZonePrison": return "Prison";
                case "trainingZoneHQ": return "HQ";
                case "trainingZoneStation": return "Station";
                case "trainingZoneRiver": return "River";
                case "trainingReset": return "RESET";
                case "profileGuest": return "Not connected";
                case "goSettings": return "Go to settings";
                case "logout": return "Log out";
                case "welcomeKicker": return "STEP INTO WZPRO";
                case "welcomeTitle": return "WZPRO COMPANION TRACKS YOUR GAME STATS";
                case "welcomeSubtitle": return "";
                case "welcomeStats": return "Live stats import  /  Free access  /  Premium modules ready";
                case "welcomeLoginTitle": return "Connect to continue";
                case "welcomeConnect": return "CONNECT WZPRO";
                case "welcomeSite": return "OPEN SITE";
                case "welcomeStatus": return "Connection opens your browser with a temporary code. Once approved, this app continues automatically.";
                case "stopped": return "Stopped";
                case "disconnected": return "Not connected";
                case "connect": return "CONNECT TO WZPRO";
                case "reconnect": return "RECONNECT";
                case "verifyEvery": return "Check every";
                case "seconds": return "seconds";
                case "start": return "START";
                case "stop": return "STOP";
                case "hint": return "Connection opens your browser. Once authorized on the site, the key stays hidden in this app.";
                case "highlightsTitle": return "Highlights Pro";
                case "highlightsToggle": return "AUTO CLIPS";
                case "highlightsDesc": return "Records your strong moments (win, multi-kill, top 3) into your clips folder automatically while you play, with a light built-in recorder.";
                case "gameBar": return "XBOX GAME BAR";
                case "highlightsStatusOn": return "Ready for Pro access. Choose the clip folder, then unlock Premium on the site.";
                case "highlightsStatusOff": return "Optional paid add-on. Free tracking keeps working without it.";
                case "highlightsQueued": return "Highlights Pro selected. Clip folder: ";
                case "clipsFolderTitle": return "Clip save folder";
                case "clipsFolderUnset": return "No folder selected yet. Default clips will use Videos\\WZPRO Clips.";
                case "clipsFolderChoose": return "CHOOSE";
                case "clipsFolderOpen": return "OPEN";
                case "clipsFolderSaved": return "Clip folder saved: ";
                case "clipsFolderError": return "Unable to use this folder: ";
                case "premiumCheckout": return "UNLOCK PREMIUM ON SITE";
                case "premiumCheckoutHint": return "Premium is paid on wzprometa.com. The desktop app stays free for stat tracking.";
                case "premiumRefresh": return "CHECK PREMIUM ACCESS";
                case "premiumChecking": return "Checking Premium access...";
                case "premiumActive": return "Premium active on this WZPRO account.";
                case "premiumInactive": return "Premium not active yet. Pay on the site, then check again.";
                case "premiumCheckFailed": return "Premium check failed: ";
                case "premiumRequired": return "Premium access is required for automatic clips.";
                case "clipsFolderReady": return "Premium clips will be saved in ";
                case "imports": return "Imports";
                case "metaToday": return "Meta of the day: ";
                case "tipPrefix": return "Tip: ";
                case "patchPrefix": return "Patch: ";
                case "sessionSummary": return "Session recap: ";
                case "sessionGamesSuffix": return " games in ";
                case "statsButton": return "MY STATS";
                case "statsLoading": return "Loading stats...";
                case "statsFailed": return "Stats unavailable.";
                case "statsLevel": return "Level: ";
                case "overlayButton": return "OVERLAY";
                case "overlayGames": return "Games: ";
                case "overlayHighlights": return "Highlights: ";
                case "overlayReplay": return "Replay: ";
                case "highlightDetected": return "Highlight: ";
                case "highlightWin": return "Victory";
                case "highlightTop3": return "Top 3";
                case "highlightMultikill": return "Multi-kill";
                case "highlightDominant": return "Dominant win";
                case "highlightBigDamage": return "Big damage";
                case "highlightSaved": return "Highlight saved in ";
                case "highlightClip": return "Game Bar capture triggered (Win+Alt+G).";
                case "recorderUnavailable": return "Clip recorder unavailable: ";
                case "clipSaving": return "Saving clip: ";
                case "clipFailed": return "Clip save failed: ";
                case "manualReplaySaved": return "Instant replay saved.";
                case "manualReplayRequested": return "Instant replay requested via Game Bar.";
                case "manualReplayPremium": return "Instant replay is a Premium feature.";
                case "manualReplayEmpty": return "Nothing buffered yet - play a few seconds first.";
                case "manualReplayNoRecorder": return "Recorder not ready - start a game first.";
                case "manualReplayHotkeyActive": return "Instant replay hotkey (Premium): ";
                case "manualReplayHotkeyUnavailable": return "Instant replay unavailable (hotkey conflict).";
                case "manualReplayHotkeyTaken": return "No instant replay hotkey could be registered (all taken by other apps).";
                case "manualReplayHint": return "Instant replay: {key} saves the last clip on demand.";
                case "modeSocial": return "Output: Social (montage)";
                case "modeRaw": return "Output: Raw clips (pro)";
                case "modeFull": return "Output: Full game + AI coach";
                case "modeAsk": return "Output: Ask after each game";
                case "endGameTitle": return "Game over - save this game as:";
                case "endGameSocial": return "Social montage";
                case "endGameCoach": return "Game + AI coach";
                case "endGameSkip": return "Skip";
                case "musicButton": return "Background music";
                case "musicNone": return "No music (silent)";
                case "audioButton": return "Multitrack audio";
                case "audioTitle": return "Multitrack audio (full game)";
                case "audioSystem": return "System / game audio (loopback device):";
                case "audioMic": return "Microphone:";
                case "audioNone": return "None";
                case "audioHint": return "Records both as separate tracks. System audio needs a loopback device (Stereo Mix, VB-Cable, Voicemeeter).";
                case "audioSave": return "Save";
                case "audioCancel": return "Cancel";
                case "audioSaved": return "Audio devices saved.";
                case "clipsNeedConnect": return "Connect your WZPRO account first (Free Access tab), then unlock Premium to enable auto clips.";
                case "clipsNeedPremium": return "Auto clips need Premium. Unlock it on the site, then click 'Check Premium access'. Checking now...";
                case "fmtVertical": return "Format: Vertical 9:16";
                case "fmtSquare": return "Format: Square 1:1";
                case "fmtHorizontal": return "Format: Horizontal 16:9";
                case "montageSaved": return "Montage saved: ";
                case "montageFailed": return "Montage failed: ";
                case "fullGameSaved": return "Full game saved: ";
                case "coachTitle": return "Game coach analysis";
                case "coachAdviceTitle": return "Advice:";
                case "coachWin": return "Win secured - keep closing out late-game fights with that composure.";
                case "coachLowKills": return "Low kills - take more early fights to build loadout cash and confidence.";
                case "coachHighKills": return "High-kill game - work on surviving longer to convert it into wins.";
                case "coachDamageNoFinish": return "Lots of damage without finishes - push angles, avoid open ground.";
                case "coachEarlyDeath": return "Died early - play safer in the opening and rotate before the zone.";
                case "coachGeneric": return "Rewatch this recording and note one decision you would change.";
                case "journal": return "Log";
                case "ready": return "Ready. Start when Warzone is open.";
                case "site": return "WZPRO site: ";
                case "connecting": return "Connecting...";
                case "loginImpossible": return "Connection impossible";
                case "loginFailed": return "Login failed: ";
                case "openBrowserCode": return "Open browser authorization code ";
                case "connectedAs": return "Connected to WZPRO as ";
                case "expired": return "Connection code expired. Start again.";
                case "waitingAuth": return "Waiting for authorization: ";
                case "connectFirst": return "Connect WZPRO Companion to your account first.";
                case "engineMissing": return "WZPRO engine not found.";
                case "starting": return "Starting...";
                case "startingFor": return "Starting companion for ";
                case "stopping": return "Stopping companion...";
                case "stopFailed": return "Stop failed: ";
                case "warzoneMissing": return "Warzone not detected";
                case "warzoneFocus": return "Warzone open - focus the game";
                case "watching": return "Warzone active - watching";
                case "gameImported": return "Game imported";
                case "waiting": return "Waiting";
                case "show": return "Show";
                case "quit": return "Quit completely";
                case "trayStopped": return "WZPRO Companion - Stopped";
                case "trayWaitingWarzone": return "WZPRO Companion - Waiting for Warzone";
                case "trayWaitingFocus": return "WZPRO Companion - Waiting for focus";
                case "trayWatching": return "WZPRO Companion - Watching Warzone";
                case "minimizeTitle": return "WZprometa";
                case "minimizeNotice": return "WZprometa is minimized to the notification area.";
                case "minimizeBody": return "The app can keep running in the background. You can also quit the application completely.";
                case "engineExited": return "Companion engine stopped. Exit code: ";
                case "crashLogged": return "A crash report was saved in ";
                case "reduce": return "MINIMIZE";
                case "quitDialog": return "QUIT COMPLETELY";
                case "gamePrefix": return "Game ";
                case "joinFailed": return "Unable to reach ";
                case "joinAdvice": return ". Check your internet connection or restart the app with -Site https://wzprometa.com.";
            }
        }
        else if (languageCode == "es")
        {
            switch (key)
            {
                case "title": return "WZPRO COMPANION";
                case "lead": return "";
                case "themeLight": return "MODO CLARO";
                case "themeDark": return "MODO OSCURO";
                case "freeAccess": return "ACCESO GRATIS";
                case "premiumAccess": return "PREMIUM";
                case "freePageTitle": return "Tracker gratis";
                case "freePageDesc": return "Conecta WZPRO, abre Warzone y deja que Companion importe tus stats de fin de partida.";
                case "premiumPageTitle": return "Acceso premium";
                case "premiumPageDesc": return "Modulos de pago opcionales para clips, review y automatizaciones mas completas en la misma app.";
                case "trainingAccess": return "TRAINING LAB";
                case "trainingPageTitle": return "Training Lab";
                case "trainingPageDesc": return "Define un foco de sesion, revisa malas decisiones y marca zonas de riesgo antes de buscar partida.";
                case "trainingGoalTitle": return "Foco de sesion";
                case "trainingGoalDesc": return "Elige un comportamiento claro para proteger en las proximas partidas.";
                case "trainingGoalSurvive": return "SOBREVIVIR";
                case "trainingGoalFinish": return "REMATAR";
                case "trainingGoalRotate": return "ROTAR";
                case "trainingGoalComms": return "COMMS";
                case "trainingCategoriesTitle": return "Categorias";
                case "trainingModuleNotes": return "Notas";
                case "trainingModuleDone": return "HECHO";
                case "trainingModuleProgress": return "Progreso ";
                case "trainingModuleScore": return "Score ";
                case "trainingReviewTitle": return "Review de decisiones";
                case "trainingReviewDrop": return "Caida demasiado caliente";
                case "trainingReviewRotate": return "Rotacion tarde";
                case "trainingReviewPush": return "Mal timing de push";
                case "trainingReviewRegain": return "Regain sin plan";
                case "trainingReviewTilt": return "Tilt / piloto automatico";
                case "trainingReadinessTitle": return "Preparacion";
                case "trainingReady": return "Listo para buscar. Mantiene el foco visible y juega limpio el primer circulo.";
                case "trainingWarmup": return "Calienta primero. Limpia dos puntos de review antes de subir el ritmo.";
                case "trainingResetHint": return "Reinicia la sesion: caida mas calma, rotacion antes, peleas simples.";
                case "trainingHeatmapTitle": return "Zonas de riesgo";
                case "trainingHeatmapDesc": return "Pulsa cada zona para alternar riesgo bajo, medio o alto.";
                case "trainingZoneLow": return "BAJO";
                case "trainingZoneMedium": return "MED";
                case "trainingZoneHigh": return "ALTO";
                case "trainingZonePrison": return "Prison";
                case "trainingZoneHQ": return "HQ";
                case "trainingZoneStation": return "Station";
                case "trainingZoneRiver": return "River";
                case "trainingReset": return "RESET";
                case "profileGuest": return "No conectado";
                case "goSettings": return "Ir a ajustes";
                case "logout": return "Cerrar sesion";
                case "welcomeKicker": return "ENTRA EN WZPRO";
                case "welcomeTitle": return "WZPRO COMPANION TRACKEA TUS STATS DE PARTIDA";
                case "welcomeSubtitle": return "";
                case "welcomeStats": return "Import de stats  /  Acceso gratis  /  Modulos premium listos";
                case "welcomeLoginTitle": return "Conecta para continuar";
                case "welcomeConnect": return "CONECTAR WZPRO";
                case "welcomeSite": return "ABRIR SITIO";
                case "welcomeStatus": return "La conexion abre tu navegador con un codigo temporal. Tras aprobarlo, esta app continua automaticamente.";
                case "stopped": return "Detenido";
                case "disconnected": return "No conectado";
                case "connect": return "CONECTAR A WZPRO";
                case "reconnect": return "RECONECTAR";
                case "verifyEvery": return "Comprobar cada";
                case "seconds": return "segundos";
                case "start": return "INICIAR";
                case "stop": return "PARAR";
                case "hint": return "La conexion abre tu navegador. Una vez autorizada en el sitio, la clave queda oculta en esta app.";
                case "highlightsTitle": return "Highlights Pro";
                case "highlightsToggle": return "CLIPS AUTO";
                case "highlightsDesc": return "Graba tus mejores momentos (victoria, multi-baja, top 3) en tu carpeta de clips automaticamente mientras juegas, con un grabador integrado ligero.";
                case "gameBar": return "XBOX GAME BAR";
                case "highlightsStatusOn": return "Listo para acceso Pro. Elige la carpeta de clips y desbloquea Premium en el sitio.";
                case "highlightsStatusOff": return "Add-on de pago opcional. El tracking gratis sigue funcionando sin el.";
                case "highlightsQueued": return "Highlights Pro seleccionado. Carpeta de clips: ";
                case "clipsFolderTitle": return "Carpeta de clips";
                case "clipsFolderUnset": return "Ninguna carpeta seleccionada. Por defecto se usara Videos\\WZPRO Clips.";
                case "clipsFolderChoose": return "ELEGIR";
                case "clipsFolderOpen": return "ABRIR";
                case "clipsFolderSaved": return "Carpeta de clips guardada: ";
                case "clipsFolderError": return "No se puede usar esta carpeta: ";
                case "premiumCheckout": return "DESBLOQUEAR PREMIUM";
                case "premiumCheckoutHint": return "Premium se paga en wzprometa.com. El tracking de stats sigue gratis.";
                case "premiumRefresh": return "COMPROBAR PREMIUM";
                case "premiumChecking": return "Comprobando acceso Premium...";
                case "premiumActive": return "Premium activo en esta cuenta WZPRO.";
                case "premiumInactive": return "Premium aun no esta activo. Paga en el sitio y vuelve a comprobar.";
                case "premiumCheckFailed": return "Error al comprobar Premium: ";
                case "premiumRequired": return "Se requiere Premium para los clips automaticos.";
                case "clipsFolderReady": return "Los clips Premium se guardaran en ";
                case "imports": return "Importaciones";
                case "metaToday": return "Meta del dia: ";
                case "tipPrefix": return "Consejo: ";
                case "patchPrefix": return "Patch: ";
                case "sessionSummary": return "Resumen de sesion: ";
                case "sessionGamesSuffix": return " partidas en ";
                case "statsButton": return "MIS STATS";
                case "statsLoading": return "Cargando stats...";
                case "statsFailed": return "Stats no disponibles.";
                case "statsLevel": return "Nivel: ";
                case "overlayButton": return "SUPERPOSICION";
                case "overlayGames": return "Partidas: ";
                case "overlayHighlights": return "Clips: ";
                case "overlayReplay": return "Replay: ";
                case "highlightDetected": return "Momento destacado: ";
                case "highlightWin": return "Victoria";
                case "highlightTop3": return "Top 3";
                case "highlightMultikill": return "Multi-baja";
                case "highlightDominant": return "Victoria dominante";
                case "highlightBigDamage": return "Mucho danio";
                case "highlightSaved": return "Momento guardado en ";
                case "highlightClip": return "Captura Game Bar activada (Win+Alt+G).";
                case "recorderUnavailable": return "Grabador de clips no disponible: ";
                case "clipSaving": return "Guardando clip: ";
                case "clipFailed": return "Error al guardar clip: ";
                case "manualReplaySaved": return "Repeticion instantanea guardada.";
                case "manualReplayRequested": return "Repeticion instantanea solicitada via Game Bar.";
                case "manualReplayPremium": return "La repeticion instantanea es una funcion Premium.";
                case "manualReplayEmpty": return "Aun no hay grabacion - juega unos segundos primero.";
                case "manualReplayNoRecorder": return "Grabador no listo - inicia una partida primero.";
                case "manualReplayHotkeyActive": return "Atajo de repeticion (Premium): ";
                case "manualReplayHotkeyUnavailable": return "Repeticion instantanea no disponible (conflicto de atajo).";
                case "manualReplayHotkeyTaken": return "No se pudo registrar ningun atajo de repeticion (todos en uso por otras apps).";
                case "manualReplayHint": return "Repeticion instantanea: {key} guarda el ultimo clip al instante.";
                case "modeSocial": return "Salida: Redes (montaje)";
                case "modeRaw": return "Salida: Bruto (pro)";
                case "modeFull": return "Salida: Partida + Coach IA";
                case "modeAsk": return "Salida: Preguntar tras cada partida";
                case "endGameTitle": return "Fin de partida - guardar como:";
                case "endGameSocial": return "Montaje redes";
                case "endGameCoach": return "Partida + Coach IA";
                case "endGameSkip": return "Omitir";
                case "musicButton": return "Musica de fondo";
                case "musicNone": return "Sin musica (silencio)";
                case "audioButton": return "Audio multipista";
                case "audioTitle": return "Audio multipista (partida completa)";
                case "audioSystem": return "Audio del sistema / juego (dispositivo loopback):";
                case "audioMic": return "Microfono:";
                case "audioNone": return "Ninguno";
                case "audioHint": return "Graba ambos en pistas separadas. El audio del sistema necesita un dispositivo loopback (Stereo Mix, VB-Cable, Voicemeeter).";
                case "audioSave": return "Guardar";
                case "audioCancel": return "Cancelar";
                case "audioSaved": return "Dispositivos de audio guardados.";
                case "clipsNeedConnect": return "Conecta primero tu cuenta WZPRO (pestana Free Access), luego desbloquea Premium para los clips automaticos.";
                case "clipsNeedPremium": return "Los clips automaticos necesitan Premium. Desbloquealo en el sitio y pulsa 'Verificar acceso Premium'. Verificando...";
                case "fmtVertical": return "Formato: Vertical 9:16";
                case "fmtSquare": return "Formato: Cuadrado 1:1";
                case "fmtHorizontal": return "Formato: Horizontal 16:9";
                case "montageSaved": return "Montaje guardado: ";
                case "montageFailed": return "Error de montaje: ";
                case "fullGameSaved": return "Partida completa guardada: ";
                case "coachTitle": return "Analisis coach de la partida";
                case "coachAdviceTitle": return "Consejos:";
                case "coachWin": return "Victoria - sigue cerrando los combates de final de partida con esa calma.";
                case "coachLowKills": return "Pocas bajas - busca mas peleas al inicio para cash y confianza.";
                case "coachHighKills": return "Partida con muchas bajas - sobrevive mas para convertirlo en victorias.";
                case "coachDamageNoFinish": return "Mucho dano sin rematar - juega los angulos, evita el campo abierto.";
                case "coachEarlyDeath": return "Muerte temprana - juega mas seguro al inicio y rota antes de la zona.";
                case "coachGeneric": return "Revisa esta grabacion y anota una decision que cambiarias.";
                case "journal": return "Registro";
                case "ready": return "Listo. Inicia cuando Warzone este abierto.";
                case "site": return "Sitio WZPRO: ";
                case "connecting": return "Conectando...";
                case "loginImpossible": return "Conexion imposible";
                case "loginFailed": return "Error de conexion: ";
                case "openBrowserCode": return "Abrir codigo de autorizacion en el navegador ";
                case "connectedAs": return "Conectado a WZPRO como ";
                case "expired": return "El codigo de conexion expiro. Vuelve a empezar.";
                case "waitingAuth": return "Esperando autorizacion: ";
                case "connectFirst": return "Primero conecta WZPRO Companion a tu cuenta.";
                case "engineMissing": return "Motor WZPRO no encontrado.";
                case "starting": return "Iniciando...";
                case "startingFor": return "Iniciando companion para ";
                case "stopping": return "Deteniendo companion...";
                case "stopFailed": return "Error al detener: ";
                case "warzoneMissing": return "Warzone no detectado";
                case "warzoneFocus": return "Warzone abierto - activa el juego";
                case "watching": return "Warzone activo - vigilancia";
                case "gameImported": return "Partida importada";
                case "waiting": return "En espera";
                case "show": return "Mostrar";
                case "quit": return "Cerrar totalmente";
                case "trayStopped": return "WZPRO Companion - Detenido";
                case "trayWaitingWarzone": return "WZPRO Companion - Esperando Warzone";
                case "trayWaitingFocus": return "WZPRO Companion - Esperando foco";
                case "trayWatching": return "WZPRO Companion - Vigilando Warzone";
                case "minimizeTitle": return "WZprometa";
                case "minimizeNotice": return "WZprometa esta minimizado en el area de notificaciones.";
                case "minimizeBody": return "La app puede seguir funcionando en segundo plano. Tambien puedes cerrarla totalmente.";
                case "engineExited": return "El motor Companion se detuvo. Codigo de salida: ";
                case "crashLogged": return "Informe de crash guardado en ";
                case "reduce": return "MINIMIZAR";
                case "quitDialog": return "CERRAR TOTALMENTE";
                case "gamePrefix": return "Partida ";
                case "joinFailed": return "No se puede contactar ";
                case "joinAdvice": return ". Comprueba tu conexion a internet o reinicia la app con -Site https://wzprometa.com.";
            }
        }

        switch (key)
        {
            case "title": return "WZPRO COMPANION";
            case "lead": return "";
            case "themeLight": return "MODE CLAIR";
            case "themeDark": return "MODE SOMBRE";
            case "freeAccess": return "FREE ACCESS";
            case "premiumAccess": return "PREMIUM";
            case "freePageTitle": return "Tracker gratuit";
            case "freePageDesc": return "Connecte WZPRO, lance Warzone et laisse Companion importer automatiquement tes stats de fin de game.";
            case "premiumPageTitle": return "Acces premium";
            case "premiumPageDesc": return "Modules payants optionnels pour les clips, la review et plus d automatisations dans la meme app.";
            case "trainingAccess": return "TRAINING LAB";
            case "trainingPageTitle": return "Training Lab";
            case "trainingPageDesc": return "Fixe un focus de session, review les mauvaises decisions et garde les zones a risque sous les yeux avant de relancer.";
            case "trainingGoalTitle": return "Focus de session";
            case "trainingGoalDesc": return "Choisis un comportement clair a proteger sur les prochaines games.";
            case "trainingGoalSurvive": return "SURVIE";
            case "trainingGoalFinish": return "FINIR";
            case "trainingGoalRotate": return "ROTATION";
            case "trainingGoalComms": return "COMMS";
            case "trainingCategoriesTitle": return "Categories";
            case "trainingModuleNotes": return "Notes";
            case "trainingModuleDone": return "FAIT";
            case "trainingModuleProgress": return "Progression ";
            case "trainingModuleScore": return "Score ";
            case "trainingReviewTitle": return "Review decision";
            case "trainingReviewDrop": return "Drop trop chaud";
            case "trainingReviewRotate": return "Rotation tardive";
            case "trainingReviewPush": return "Mauvais timing push";
            case "trainingReviewRegain": return "Regain sans plan";
            case "trainingReviewTilt": return "Tilt / pilote auto";
            case "trainingReadinessTitle": return "Readiness";
            case "trainingReady": return "Pret a relancer. Garde le focus selectionne visible et joue propre le premier cercle.";
            case "trainingWarmup": return "Echauffe-toi d abord. Nettoie deux points de review avant de monter le rythme.";
            case "trainingResetHint": return "Reset la session : drop plus calme, rotation plus tot, fights plus simples.";
            case "trainingHeatmapTitle": return "Zones a risque";
            case "trainingHeatmapDesc": return "Clique chaque zone pour passer entre risque faible, moyen ou haut.";
            case "trainingZoneLow": return "BAS";
            case "trainingZoneMedium": return "MOY";
            case "trainingZoneHigh": return "HAUT";
            case "trainingZonePrison": return "Prison";
            case "trainingZoneHQ": return "HQ";
            case "trainingZoneStation": return "Station";
            case "trainingZoneRiver": return "River";
            case "trainingReset": return "RESET";
            case "profileGuest": return "Non connecte";
            case "goSettings": return "Go to settings";
            case "logout": return "Deconnexion";
            case "welcomeKicker": return "ENTRE DANS WZPRO";
            case "welcomeTitle": return "WZPRO COMPANION TRACKE TES STATISTIQUES DE GAME";
            case "welcomeSubtitle": return "";
            case "welcomeStats": return "Import stats live  /  Acces gratuit  /  Modules premium prets";
            case "welcomeLoginTitle": return "Connexion requise";
            case "welcomeConnect": return "CONNECTER WZPRO";
            case "welcomeSite": return "OUVRIR LE SITE";
            case "welcomeStatus": return "La connexion ouvre ton navigateur avec un code temporaire. Une fois validee, l app continue automatiquement.";
            case "stopped": return "Arrete";
            case "disconnected": return "Non connecte";
            case "connect": return "SE CONNECTER A WZPRO";
            case "reconnect": return "RECONNECTER";
            case "verifyEvery": return "Verifier toutes";
            case "seconds": return "secondes";
            case "start": return "START";
            case "stop": return "STOP";
            case "hint": return "La connexion ouvre ton navigateur. Une fois autorisee sur le site, la cle reste cachee dans cette app.";
            case "highlightsTitle": return "Highlights Pro";
            case "highlightsToggle": return "CLIPS AUTO";
            case "highlightsDesc": return "Enregistre tes moments forts (victoire, multi-kill, top 3) dans ton dossier de clips automatiquement, via un enregistreur integre leger.";
            case "gameBar": return "XBOX GAME BAR";
            case "highlightsStatusOn": return "Pret pour l acces Pro. Choisis le dossier des clips, puis debloque Premium sur le site.";
            case "highlightsStatusOff": return "Option payante non obligatoire. Le tracking gratuit continue sans elle.";
            case "highlightsQueued": return "Highlights Pro selectionne. Dossier des clips : ";
            case "clipsFolderTitle": return "Dossier d enregistrement des clips";
            case "clipsFolderUnset": return "Aucun dossier choisi. Par defaut les clips iront dans Videos\\WZPRO Clips.";
            case "clipsFolderChoose": return "CHOISIR";
            case "clipsFolderOpen": return "OUVRIR";
            case "clipsFolderSaved": return "Dossier des clips enregistre : ";
            case "clipsFolderError": return "Impossible d utiliser ce dossier : ";
            case "premiumCheckout": return "DEBLOQUER PREMIUM SUR LE SITE";
            case "premiumCheckoutHint": return "Le premium se paie sur wzprometa.com. Le tracking de stats reste gratuit.";
            case "premiumRefresh": return "VERIFIER L ACCES PREMIUM";
            case "premiumChecking": return "Verification de l acces Premium...";
            case "premiumActive": return "Premium actif sur ce compte WZPRO.";
            case "premiumInactive": return "Premium pas encore actif. Paie sur le site, puis verifie a nouveau.";
            case "premiumCheckFailed": return "Verification Premium impossible : ";
            case "premiumRequired": return "L acces Premium est requis pour les clips automatiques.";
            case "clipsFolderReady": return "Les clips Premium seront enregistres dans ";
            case "imports": return "Imports";
            case "metaToday": return "Meta du jour : ";
            case "tipPrefix": return "Astuce : ";
            case "patchPrefix": return "Patch : ";
            case "sessionSummary": return "Recap session : ";
            case "sessionGamesSuffix": return " parties en ";
            case "statsButton": return "MES STATS";
            case "statsLoading": return "Chargement stats...";
            case "statsFailed": return "Stats indisponibles.";
            case "statsLevel": return "Niveau : ";
            case "overlayButton": return "SUPERPOSITION";
            case "overlayGames": return "Parties : ";
            case "overlayHighlights": return "Moments forts : ";
            case "overlayReplay": return "Replay : ";
            case "highlightDetected": return "Moment fort : ";
            case "highlightWin": return "Victoire";
            case "highlightTop3": return "Top 3";
            case "highlightMultikill": return "Multi-kill";
            case "highlightDominant": return "Victoire dominante";
            case "highlightBigDamage": return "Gros degats";
            case "highlightSaved": return "Moment fort enregistre dans ";
            case "highlightClip": return "Capture Game Bar declenchee (Win+Alt+G).";
            case "recorderUnavailable": return "Enregistreur de clips indisponible : ";
            case "clipSaving": return "Enregistrement du clip : ";
            case "clipFailed": return "Echec d enregistrement du clip : ";
            case "manualReplaySaved": return "Replay instantane enregistre.";
            case "manualReplayRequested": return "Replay instantane demande via Game Bar.";
            case "manualReplayPremium": return "Le replay instantane est une fonction Premium.";
            case "manualReplayEmpty": return "Rien en memoire encore - joue quelques secondes d abord.";
            case "manualReplayNoRecorder": return "Enregistreur non pret - lance une partie d abord.";
            case "manualReplayHotkeyActive": return "Raccourci replay (Premium) : ";
            case "manualReplayHotkeyUnavailable": return "Replay instantane indisponible (conflit de raccourci).";
            case "manualReplayHotkeyTaken": return "Aucun raccourci replay n a pu etre enregistre (tous pris par d autres apps).";
            case "manualReplayHint": return "Replay instantane : {key} enregistre le dernier clip a la demande.";
            case "modeSocial": return "Sortie : Reseaux (montage)";
            case "modeRaw": return "Sortie : Brut (pro)";
            case "modeFull": return "Sortie : Game complete + Coach IA";
            case "modeAsk": return "Sortie : Demander apres chaque game";
            case "endGameTitle": return "Fin de game - enregistrer en :";
            case "endGameSocial": return "Montage reseaux";
            case "endGameCoach": return "Game + Coach IA";
            case "endGameSkip": return "Ignorer";
            case "musicButton": return "Musique de fond";
            case "musicNone": return "Aucune musique (muet)";
            case "audioButton": return "Audio multipiste";
            case "audioTitle": return "Audio multipiste (game complete)";
            case "audioSystem": return "Audio systeme / jeu (peripherique loopback) :";
            case "audioMic": return "Microphone :";
            case "audioNone": return "Aucun";
            case "audioHint": return "Enregistre les deux en pistes separees. L audio systeme requiert un peripherique loopback (Stereo Mix, VB-Cable, Voicemeeter).";
            case "audioSave": return "Enregistrer";
            case "audioCancel": return "Annuler";
            case "audioSaved": return "Peripheriques audio enregistres.";
            case "clipsNeedConnect": return "Connecte d abord ton compte WZPRO (onglet Free Access), puis active le Premium pour les clips auto.";
            case "clipsNeedPremium": return "Les clips auto necessitent le Premium. Active-le sur le site, puis clique 'Verifier l acces Premium'. Verification en cours...";
            case "fmtVertical": return "Format : Vertical 9:16";
            case "fmtSquare": return "Format : Carre 1:1";
            case "fmtHorizontal": return "Format : Horizontal 16:9";
            case "montageSaved": return "Montage enregistre : ";
            case "montageFailed": return "Echec du montage : ";
            case "fullGameSaved": return "Game complete enregistree : ";
            case "coachTitle": return "Analyse coach de la game";
            case "coachAdviceTitle": return "Conseils :";
            case "coachWin": return "Victoire - continue a fermer les combats de fin de game avec ce calme.";
            case "coachLowKills": return "Peu de kills - prends plus de combats tot pour le cash et la confiance.";
            case "coachHighKills": return "Game a gros kills - travaille la survie pour transformer en victoires.";
            case "coachDamageNoFinish": return "Beaucoup de degats sans finir - joue les angles, evite le decouvert.";
            case "coachEarlyDeath": return "Mort tot - joue plus safe au debut et rote avant la zone.";
            case "coachGeneric": return "Revois cet enregistrement et note une decision que tu changerais.";
            case "journal": return "Journal";
            case "ready": return "Pret. Lance quand Warzone est ouvert.";
            case "site": return "Site WZPRO: ";
            case "connecting": return "Connexion en cours...";
            case "loginImpossible": return "Connexion impossible";
            case "loginFailed": return "Connexion echouee : ";
            case "openBrowserCode": return "Ouverture du navigateur avec le code ";
            case "connectedAs": return "Connecte a WZPRO en tant que ";
            case "expired": return "Le code de connexion a expire. Recommence.";
            case "waitingAuth": return "En attente d autorisation : ";
            case "connectFirst": return "Connecte d'abord WZPRO Companion a ton compte.";
            case "engineMissing": return "Moteur WZPRO introuvable.";
            case "starting": return "Demarrage...";
            case "startingFor": return "Demarrage du companion pour ";
            case "stopping": return "Arret du companion...";
            case "stopFailed": return "Arret impossible : ";
            case "warzoneMissing": return "Warzone non detecte";
            case "warzoneFocus": return "Warzone ouvert - active le jeu";
            case "watching": return "Warzone actif - surveillance";
            case "gameImported": return "Game importee";
            case "waiting": return "En attente";
            case "show": return "Afficher";
            case "quit": return "Fermer totalement";
            case "trayStopped": return "WZPRO Companion - Arrete";
            case "trayWaitingWarzone": return "WZPRO Companion - En attente de Warzone";
            case "trayWaitingFocus": return "WZPRO Companion - En attente du focus";
            case "trayWatching": return "WZPRO Companion - Surveillance Warzone";
            case "minimizeTitle": return "WZprometa";
            case "minimizeNotice": return "WZprometa est reduit dans la zone de notification.";
            case "minimizeBody": return "L app peut continuer en arriere-plan. Tu peux aussi fermer totalement l application.";
            case "engineExited": return "Le moteur Companion s est arrete. Code de sortie : ";
            case "crashLogged": return "Rapport de crash enregistre dans ";
            case "reduce": return "REDUIRE";
            case "quitDialog": return "FERMER TOTALEMENT";
            case "gamePrefix": return "Game ";
            case "joinFailed": return "Impossible de joindre ";
            case "joinAdvice": return ". Verifie ta connexion internet ou relance l'app avec -Site https://wzprometa.com.";
        }
        return key;
    }

    private bool IsRunning
    {
        get { return companionProcess != null && !companionProcess.HasExited; }
    }

    private void ToggleTheme()
    {
        themeMode = themeMode == "light" ? "dark" : "light";
        ApplyTheme();
        ApplyLanguage();
        RefreshConnectionUi();
        if (!IsRunning) SetRunningState(false);
        SaveSession();
    }

    private void OnLanguageChanged()
    {
        if (updatingLanguageUi || languageBox.SelectedItem == null) return;
        languageCode = languageBox.SelectedItem.ToString().ToLowerInvariant();
        ApplyLanguage();
        RefreshConnectionUi();
        if (!IsRunning) SetRunningState(false);
        SaveSession();
    }

    private void OnWelcomeLanguageChanged()
    {
        if (updatingLanguageUi || welcomeLanguageBox.SelectedItem == null) return;
        languageCode = welcomeLanguageBox.SelectedItem.ToString().ToLowerInvariant();
        ApplyLanguage();
        RefreshConnectionUi();
        SaveSession();
    }

    private void ShowWelcome()
    {
        if (welcomePanel != null) welcomePanel.Visible = true;
        if (sidebarPanel != null) sidebarPanel.Visible = false;
        if (mainPanel != null) mainPanel.Visible = false;
    }

    private void ShowAppShell()
    {
        if (welcomePanel != null) welcomePanel.Visible = false;
        if (sidebarPanel != null) sidebarPanel.Visible = true;
        if (mainPanel != null) mainPanel.Visible = true;
        ShowPage(activePage);
    }

    private void ShowPage(string page)
    {
        activePage = page == "premium" ? "premium" : page == "training" ? "training" : "free";
        bool free = activePage == "free";
        bool premium = activePage == "premium";
        bool training = activePage == "training";

        if (freeInfoCard != null) freeInfoCard.Visible = free;
        if (freeConnectionCard != null) freeConnectionCard.Visible = free;
        if (freeControlsCard != null) freeControlsCard.Visible = free;
        importsLabel.Visible = free;
        historyList.Visible = free;
        journalLabel.Visible = free;
        logBox.Visible = free;

        if (premiumInfoCard != null) premiumInfoCard.Visible = premium;
        if (premiumHighlightsCard != null) premiumHighlightsCard.Visible = premium;
        if (premiumClipsCard != null) premiumClipsCard.Visible = premium;
        if (premiumAccessCard != null) premiumAccessCard.Visible = premium;
        if (premiumAdvancedCard != null) premiumAdvancedCard.Visible = premium;
        highlightsTitleLabel.Visible = premium;
        premiumPageTitleLabel.Visible = premium;
        premiumPageDescLabel.Visible = premium;
        highlightsToggle.Visible = premium;
        highlightsDescLabel.Visible = premium;
        highlightsStatusLabel.Visible = premium;
        clipsFolderTitleLabel.Visible = premium;
        clipsFolderValueLabel.Visible = premium;
        clipsFolderButton.Visible = premium;
        clipsOpenFolderButton.Visible = premium;
        premiumCheckoutHintLabel.Visible = premium;
        premiumAccessStatusLabel.Visible = premium;
        premiumCheckoutButton.Visible = premium;
        premiumRefreshButton.Visible = premium;
        if (statsButton != null) statsButton.Visible = premium;
        if (gameBarButton != null) gameBarButton.Visible = premium;
        if (statsBox != null) statsBox.Visible = premium;
        if (clipModeCombo != null) clipModeCombo.Visible = premium;
        if (socialFormatCombo != null) socialFormatCombo.Visible = premium;
        if (musicButton != null) musicButton.Visible = premium;
        if (musicLabel != null) musicLabel.Visible = premium;
        if (audioButton != null) audioButton.Visible = premium;

        if (trainingInfoCard != null) trainingInfoCard.Visible = training;
        if (trainingGoalCard != null) trainingGoalCard.Visible = training;
        if (trainingCategoryCard != null) trainingCategoryCard.Visible = training;
        if (trainingModuleCard != null) trainingModuleCard.Visible = training;
        if (trainingReviewCard != null) trainingReviewCard.Visible = false;
        if (trainingReadinessCard != null) trainingReadinessCard.Visible = false;
        if (trainingHeatmapCard != null) trainingHeatmapCard.Visible = false;
        if (training) RefreshTrainingUi();

        StylePageButtons(Theme);
        if (premium && !string.IsNullOrWhiteSpace(deviceToken) && DateTime.UtcNow.Subtract(lastPremiumCheckUtc).TotalSeconds > 45)
        {
            backgroundPremiumCheck = CheckPremiumAccess(false);
        }
    }

    private void SetTrainingGoal(string goal)
    {
        if (goal != "finish" && goal != "rotate" && goal != "comms") goal = "survive";
        trainingGoal = goal;
        RefreshTrainingUi();
        SaveSession();
    }

    private string[] TrainingModuleKeys()
    {
        return new string[]
        {
            "death", "timeline", "goals", "discipline", "loadout",
            "regain", "endgame", "comms", "heatmap", "weekly",
            "routines", "lostDamage", "ranked", "journal", "overlay"
        };
    }

    private string TrainingModuleListLabel(string key)
    {
        switch (key)
        {
            case "death": return "01  Analyse des morts";
            case "timeline": return "02  Timeline de game";
            case "goals": return "03  Objectifs session";
            case "discipline": return "04  Score discipline";
            case "loadout": return "05  Review de classe";
            case "regain": return "06  Regain";
            case "endgame": return "07  Endgame";
            case "comms": return "08  Comms & Squad";
            case "heatmap": return "09  Heatmap perso";
            case "weekly": return "10  Entrainement hebdo";
            case "routines": return "11  Bibliotheque routines";
            case "lostDamage": return "12  Degats perdus";
            case "ranked": return "13  Ranked readiness";
            case "journal": return "14  Journal decisions";
            case "overlay": return "15  Coach overlay";
        }
        return key;
    }

    private string TrainingModuleTitle(string key)
    {
        switch (key)
        {
            case "death": return "Analyse des morts avancee";
            case "timeline": return "Timeline de game";
            case "goals": return "Objectifs personnalises de session";
            case "discipline": return "Score de discipline";
            case "loadout": return "Review de classe apres performance";
            case "regain": return "Categorie Regain";
            case "endgame": return "Categorie Endgame";
            case "comms": return "Comms & Squad";
            case "heatmap": return "Heatmap personnelle";
            case "weekly": return "Mode entrainement hebdo";
            case "routines": return "Bibliotheque de routines";
            case "lostDamage": return "Analyse Degats perdus";
            case "ranked": return "Mode Ranked Readiness";
            case "journal": return "Journal de decisions";
            case "overlay": return "Coach vocal / overlay minimal";
        }
        return "Training module";
    }

    private string TrainingModuleDesc(string key)
    {
        switch (key)
        {
            case "death": return "Tag rapide de la cause de mort apres game pour trouver ce qui coute vraiment les sessions.";
            case "timeline": return "Frise manuelle et semi-auto: drop, kill, mort, regain, loadout, top 10 et fin de partie.";
            case "goals": return "Objectif choisi avant de jouer, puis verdict de reussite apres la session.";
            case "discipline": return "Indicateur hors K/D base sur placement, regularite, top 10 et efficacite des degats.";
            case "loadout": return "Conseils de classe selon degats, kills, morts close range ou placement trop passif.";
            case "regain": return "Guides de redeploy: ou atterrir, quoi looter, quel contrat prendre, rejoindre ou temporiser.";
            case "endgame": return "Checklist derniers cercles: masque, hauteur, smokes, streaks, self-revive et tempo squad.";
            case "comms": return "Callouts courts, roles d equipe et checklist de communication pour ranked.";
            case "heatmap": return "Zones favorites, zones de mort et zones de victoire alimentees manuellement.";
            case "weekly": return "Plan 7 jours relie au coach: aim, rotations, regain, discipline ranked et review.";
            case "routines": return "Routines courtes pour warmup, anti-tilt, recoil control, regain et reset mental.";
            case "lostDamage": return "Ratio degats/kills pour detecter les games ou tu casses sans finir.";
            case "ranked": return "Check pre-ranked: classe, objectif, forme recente et stabilite avant de lancer.";
            case "journal": return "Apres mauvaise game, marque drop, fight, rotation, loadout ou tilt; l app ressort le pattern.";
            case "overlay": return "Rappels minimalistes selon l objectif: rotate early, play life, reset mental.";
        }
        return "";
    }

    private string[] TrainingModuleChecklist(string key)
    {
        switch (key)
        {
            case "death": return new string[] { "Mort en rotation", "Mort sans cover", "Mort apres revive", "Push isole", "Zone / gaz" };
            case "timeline": return new string[] { "Drop note", "Premier kill marque", "Loadout / regain marque", "Top 10 marque", "Fin de game marquee" };
            case "goals": return new string[] { "Objectif choisi", "Seuil mesurable fixe", "Objectif garde visible", "Session verifiee", "Reussi ou a refaire" };
            case "discipline": return new string[] { "Placement stable", "Moins de morts early", "Top 10 suivi", "Degats par kill propres", "Regularite OK" };
            case "loadout": return new string[] { "Degats sans kills", "Morts close range", "Placement trop passif", "SMG/secondary verifie", "Classe ajustee" };
            case "regain": return new string[] { "Spot redeploy choisi", "Loot prioritaire", "Contrat prioritaire", "Shop identifie", "Solo safe ou team" };
            case "endgame": return new string[] { "Masque / gaz", "Streaks prets", "Hauteur controlee", "Smokes / cover", "Self-revive / trade" };
            case "comms": return new string[] { "Callouts courts", "Role entry", "Role support", "Role anchor/sniper", "Score comms note" };
            case "heatmap": return new string[] { "Zone favorite", "Zone de mort", "Zone de win", "Zone interdite", "Zone a retester" };
            case "weekly": return new string[] { "Jour aim", "Jour rotations", "Jour regain", "Jour discipline", "Jour review coach" };
            case "routines": return new string[] { "Warmup 10 min", "Anti-tilt", "Regain practice", "Recoil control", "Reset mental" };
            case "lostDamage": return new string[] { "Ratio degats/kills", "Cracks non finis", "Push timing", "Angles de finish", "TTK close range" };
            case "ranked": return new string[] { "Classe prete", "Objectif clair", "Forme recente", "Mental stable", "Verdict ranked" };
            case "journal": return new string[] { "Mauvais drop", "Mauvais fight", "Mauvaise rotation", "Mauvais loadout", "Tilt" };
            case "overlay": return new string[] { "Rotate early", "Play life", "Reset mental", "Rappel objectif", "Overlay minimal actif" };
        }
        return new string[] { "", "", "", "", "" };
    }

    private void PopulateTrainingCategories()
    {
        if (trainingCategoryList == null || updatingTrainingCategoryUi) return;
        updatingTrainingCategoryUi = true;
        try
        {
            string[] keys = TrainingModuleKeys();
            int selected = 0;
            trainingCategoryList.Items.Clear();
            for (int i = 0; i < keys.Length; i++)
            {
                if (keys[i] == trainingModuleKey) selected = i;
                trainingCategoryList.Items.Add(TrainingModuleListLabel(keys[i]));
            }
            if (trainingCategoryList.Items.Count > 0) trainingCategoryList.SelectedIndex = selected;
        }
        finally
        {
            updatingTrainingCategoryUi = false;
        }
    }

    private void OnTrainingCategoryChanged()
    {
        if (updatingTrainingCategoryUi || trainingCategoryList == null) return;
        string[] keys = TrainingModuleKeys();
        if (trainingCategoryList.SelectedIndex < 0 || trainingCategoryList.SelectedIndex >= keys.Length) return;
        SaveCurrentTrainingModuleState();
        trainingModuleKey = keys[trainingCategoryList.SelectedIndex];
        RefreshTrainingModuleUi();
        SaveSession();
    }

    private void RefreshTrainingModuleUi()
    {
        if (trainingModuleCard == null) return;
        updatingTrainingModuleUi = true;
        try
        {
            Label label;
            label = NamedLabel(trainingCategoryCard, "trainingCategoryTitleLabel");
            if (label != null) label.Text = T("trainingCategoriesTitle");
            label = NamedLabel(trainingModuleCard, "trainingModuleTitleLabel");
            if (label != null) label.Text = TrainingModuleTitle(trainingModuleKey);
            label = NamedLabel(trainingModuleCard, "trainingModuleDescLabel");
            if (label != null) label.Text = TrainingModuleDesc(trainingModuleKey);
            label = NamedLabel(trainingModuleCard, "trainingModuleNotesLabel");
            if (label != null) label.Text = T("trainingModuleNotes");
            label = NamedLabel(trainingModuleCard, "trainingModuleStatusLabel");
            if (label != null) label.Text = TrainingModuleStatusText(trainingModuleKey);

            string[] checklist = TrainingModuleChecklist(trainingModuleKey);
            string bits = GetTrainingModuleBits(trainingModuleKey);
            SetModuleCheck(trainingModuleCheck1, checklist, bits, 0);
            SetModuleCheck(trainingModuleCheck2, checklist, bits, 1);
            SetModuleCheck(trainingModuleCheck3, checklist, bits, 2);
            SetModuleCheck(trainingModuleCheck4, checklist, bits, 3);
            SetModuleCheck(trainingModuleCheck5, checklist, bits, 4);

            if (trainingModuleNotesBox != null) trainingModuleNotesBox.Text = GetTrainingModuleNote(trainingModuleKey);
            if (trainingModuleDoneButton != null) trainingModuleDoneButton.Text = T("trainingModuleDone");
            if (trainingModuleResetButton != null) trainingModuleResetButton.Text = T("trainingReset");
        }
        finally
        {
            updatingTrainingModuleUi = false;
        }

        var theme = Theme;
        StyleCheckBox(trainingModuleCheck1, theme);
        StyleCheckBox(trainingModuleCheck2, theme);
        StyleCheckBox(trainingModuleCheck3, theme);
        StyleCheckBox(trainingModuleCheck4, theme);
        StyleCheckBox(trainingModuleCheck5, theme);
        StylePrimaryButton(trainingModuleDoneButton, theme);
        StyleSecondaryButton(trainingModuleResetButton, theme);
    }

    private string TrainingModuleStatusText(string key)
    {
        string bits = GetTrainingModuleBits(key);
        int checkedCount = 0;
        for (int i = 0; i < bits.Length; i++) if (bits[i] == '1') checkedCount++;
        int score = Math.Min(100, checkedCount * 20);
        if (key == "discipline") score = Math.Min(100, score + Math.Min(historyCount, 10) * 2);
        if (key == "ranked") score = Math.Min(100, (score + TrainingReadinessScore()) / 2);
        if (key == "lostDamage" && trainingGoal == "finish") score = Math.Min(100, score + 10);
        if (key == "journal") score = Math.Min(100, score + TrainingReviewCount() * 6);
        return T("trainingModuleProgress") + checkedCount + "/5  |  " + T("trainingModuleScore") + score + "/100";
    }

    private void SetModuleCheck(CheckBox checkBox, string[] labels, string bits, int index)
    {
        if (checkBox == null) return;
        checkBox.Text = index < labels.Length ? labels[index] : "";
        checkBox.Checked = bits.Length > index && bits[index] == '1';
    }

    private void SaveCurrentTrainingModuleState()
    {
        if (updatingTrainingModuleUi || string.IsNullOrWhiteSpace(trainingModuleKey)) return;
        if (trainingModuleCheck1 == null && trainingModuleNotesBox == null) return;
        string bits =
            (trainingModuleCheck1 != null && trainingModuleCheck1.Checked ? "1" : "0") +
            (trainingModuleCheck2 != null && trainingModuleCheck2.Checked ? "1" : "0") +
            (trainingModuleCheck3 != null && trainingModuleCheck3.Checked ? "1" : "0") +
            (trainingModuleCheck4 != null && trainingModuleCheck4.Checked ? "1" : "0") +
            (trainingModuleCheck5 != null && trainingModuleCheck5.Checked ? "1" : "0");
        trainingModuleStates = SetTrainingMapValue(trainingModuleStates, trainingModuleKey, bits);
        if (trainingModuleNotesBox != null)
        {
            trainingModuleNotes = SetTrainingMapValue(trainingModuleNotes, trainingModuleKey, EncodeSessionValue(trainingModuleNotesBox.Text));
        }
    }

    private string GetTrainingModuleBits(string key)
    {
        string value = GetTrainingMapValue(trainingModuleStates, key);
        if (string.IsNullOrWhiteSpace(value)) return "00000";
        while (value.Length < 5) value += "0";
        return value.Substring(0, 5);
    }

    private string GetTrainingModuleNote(string key)
    {
        return DecodeSessionValue(GetTrainingMapValue(trainingModuleNotes, key));
    }

    private void OnTrainingModuleNotesChanged()
    {
        if (updatingTrainingModuleUi) return;
        SaveCurrentTrainingModuleState();
        SaveSession();
    }

    private void MarkTrainingModuleDone()
    {
        SetTrainingCheck(trainingModuleCheck1, true);
        SetTrainingCheck(trainingModuleCheck2, true);
        SetTrainingCheck(trainingModuleCheck3, true);
        SetTrainingCheck(trainingModuleCheck4, true);
        SetTrainingCheck(trainingModuleCheck5, true);
        SaveCurrentTrainingModuleState();
        RefreshTrainingUi();
        SaveSession();
    }

    private void ResetTrainingModule()
    {
        SetTrainingCheck(trainingModuleCheck1, false);
        SetTrainingCheck(trainingModuleCheck2, false);
        SetTrainingCheck(trainingModuleCheck3, false);
        SetTrainingCheck(trainingModuleCheck4, false);
        SetTrainingCheck(trainingModuleCheck5, false);
        if (trainingModuleNotesBox != null) trainingModuleNotesBox.Text = "";
        SaveCurrentTrainingModuleState();
        RefreshTrainingUi();
        SaveSession();
    }

    private string GetTrainingMapValue(string map, string key)
    {
        if (string.IsNullOrWhiteSpace(map) || string.IsNullOrWhiteSpace(key)) return "";
        string[] entries = map.Split(';');
        for (int i = 0; i < entries.Length; i++)
        {
            int p = entries[i].IndexOf(':');
            if (p <= 0) continue;
            if (string.Equals(entries[i].Substring(0, p), key, StringComparison.OrdinalIgnoreCase)) return entries[i].Substring(p + 1);
        }
        return "";
    }

    private string SetTrainingMapValue(string map, string key, string value)
    {
        var entries = new System.Collections.Generic.List<string>();
        bool written = false;
        if (!string.IsNullOrWhiteSpace(map))
        {
            string[] existing = map.Split(';');
            for (int i = 0; i < existing.Length; i++)
            {
                int p = existing[i].IndexOf(':');
                if (p <= 0) continue;
                string entryKey = existing[i].Substring(0, p);
                if (string.Equals(entryKey, key, StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrEmpty(value)) entries.Add(key + ":" + value);
                    written = true;
                }
                else
                {
                    entries.Add(existing[i]);
                }
            }
        }
        if (!written && !string.IsNullOrEmpty(value)) entries.Add(key + ":" + value);
        return string.Join(";", entries.ToArray());
    }

    private string EncodeSessionValue(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(value));
    }

    private string DecodeSessionValue(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(value));
        }
        catch
        {
            return "";
        }
    }

    private void CycleTrainingZone(int index)
    {
        if (trainingZoneRisk == null || trainingZoneRisk.Length != 4) trainingZoneRisk = new int[] { 2, 1, 1, 0 };
        if (index < 0 || index >= trainingZoneRisk.Length) return;
        trainingZoneRisk[index] = (trainingZoneRisk[index] + 1) % 3;
        RefreshTrainingUi();
        SaveSession();
    }

    private void ResetTrainingLab()
    {
        trainingGoal = "survive";
        SetTrainingCheck(trainingDropCheck, false);
        SetTrainingCheck(trainingRotateCheck, false);
        SetTrainingCheck(trainingPushCheck, false);
        SetTrainingCheck(trainingRegainCheck, false);
        SetTrainingCheck(trainingTiltCheck, false);
        trainingZoneRisk = new int[] { 2, 1, 1, 0 };
        trainingModuleKey = "death";
        trainingModuleStates = "";
        trainingModuleNotes = "";
        RefreshTrainingUi();
        SaveSession();
    }

    private void SetTrainingCheck(CheckBox checkBox, bool value)
    {
        if (checkBox != null) checkBox.Checked = value;
    }

    private int TrainingReviewCount()
    {
        int count = 0;
        if (trainingDropCheck != null && trainingDropCheck.Checked) count++;
        if (trainingRotateCheck != null && trainingRotateCheck.Checked) count++;
        if (trainingPushCheck != null && trainingPushCheck.Checked) count++;
        if (trainingRegainCheck != null && trainingRegainCheck.Checked) count++;
        if (trainingTiltCheck != null && trainingTiltCheck.Checked) count++;
        return count;
    }

    private int TrainingReadinessScore()
    {
        int zonePressure = 0;
        if (trainingZoneRisk != null)
        {
            for (int i = 0; i < trainingZoneRisk.Length; i++) zonePressure += trainingZoneRisk[i];
        }
        int score = 46 + Math.Min(sessionGameCount, 6) * 5 + Math.Min(historyCount, 10) * 2 - TrainingReviewCount() * 4 - zonePressure * 2;
        if (trainingGoal == "rotate") score += 4;
        if (trainingGoal == "comms") score += 3;
        if (score < 0) score = 0;
        if (score > 100) score = 100;
        return score;
    }

    private string TrainingReviewState()
    {
        return (trainingDropCheck != null && trainingDropCheck.Checked ? "1" : "0") +
            (trainingRotateCheck != null && trainingRotateCheck.Checked ? "1" : "0") +
            (trainingPushCheck != null && trainingPushCheck.Checked ? "1" : "0") +
            (trainingRegainCheck != null && trainingRegainCheck.Checked ? "1" : "0") +
            (trainingTiltCheck != null && trainingTiltCheck.Checked ? "1" : "0");
    }

    private void LoadTrainingReviewState(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length < 5) return;
        SetTrainingCheck(trainingDropCheck, value[0] == '1');
        SetTrainingCheck(trainingRotateCheck, value[1] == '1');
        SetTrainingCheck(trainingPushCheck, value[2] == '1');
        SetTrainingCheck(trainingRegainCheck, value[3] == '1');
        SetTrainingCheck(trainingTiltCheck, value[4] == '1');
    }

    private string TrainingZonesState()
    {
        if (trainingZoneRisk == null || trainingZoneRisk.Length != 4) trainingZoneRisk = new int[] { 2, 1, 1, 0 };
        return trainingZoneRisk[0] + "," + trainingZoneRisk[1] + "," + trainingZoneRisk[2] + "," + trainingZoneRisk[3];
    }

    private void LoadTrainingZonesState(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        string[] parts = value.Split(',');
        if (parts.Length != 4) return;
        int[] parsed = new int[4];
        for (int i = 0; i < parts.Length; i++)
        {
            int risk;
            if (!int.TryParse(parts[i], out risk)) return;
            if (risk < 0) risk = 0;
            if (risk > 2) risk = 2;
            parsed[i] = risk;
        }
        trainingZoneRisk = parsed;
    }

    private string TrainingRiskLabel(int risk)
    {
        return risk == 2 ? T("trainingZoneHigh") : risk == 1 ? T("trainingZoneMedium") : T("trainingZoneLow");
    }

    private void RefreshTrainingUi()
    {
        var theme = Theme;
        Label label;

        label = NamedLabel(trainingInfoCard, "trainingPageTitleLabel");
        if (label != null) label.Text = T("trainingPageTitle");
        label = NamedLabel(trainingInfoCard, "trainingPageDescLabel");
        if (label != null) label.Text = T("trainingPageDesc");
        label = NamedLabel(trainingGoalCard, "trainingGoalTitleLabel");
        if (label != null) label.Text = T("trainingGoalTitle");
        label = NamedLabel(trainingGoalCard, "trainingGoalDescLabel");
        if (label != null) label.Text = T("trainingGoalDesc");
        label = NamedLabel(trainingReviewCard, "trainingReviewTitleLabel");
        if (label != null) label.Text = T("trainingReviewTitle");
        label = NamedLabel(trainingReadinessCard, "trainingReadinessTitleLabel");
        if (label != null) label.Text = T("trainingReadinessTitle");
        label = NamedLabel(trainingHeatmapCard, "trainingHeatmapTitleLabel");
        if (label != null) label.Text = T("trainingHeatmapTitle");
        label = NamedLabel(trainingHeatmapCard, "trainingHeatmapDescLabel");
        if (label != null) label.Text = T("trainingHeatmapDesc");
        label = NamedLabel(trainingCategoryCard, "trainingCategoryTitleLabel");
        if (label != null) label.Text = T("trainingCategoriesTitle");

        if (trainingButton != null) trainingButton.Text = T("trainingAccess");
        if (trainingGoalSurviveButton != null) trainingGoalSurviveButton.Text = T("trainingGoalSurvive");
        if (trainingGoalFinishButton != null) trainingGoalFinishButton.Text = T("trainingGoalFinish");
        if (trainingGoalRotateButton != null) trainingGoalRotateButton.Text = T("trainingGoalRotate");
        if (trainingGoalCommsButton != null) trainingGoalCommsButton.Text = T("trainingGoalComms");
        if (trainingDropCheck != null) trainingDropCheck.Text = T("trainingReviewDrop");
        if (trainingRotateCheck != null) trainingRotateCheck.Text = T("trainingReviewRotate");
        if (trainingPushCheck != null) trainingPushCheck.Text = T("trainingReviewPush");
        if (trainingRegainCheck != null) trainingRegainCheck.Text = T("trainingReviewRegain");
        if (trainingTiltCheck != null) trainingTiltCheck.Text = T("trainingReviewTilt");
        if (trainingResetButton != null) trainingResetButton.Text = T("trainingReset");
        PopulateTrainingCategories();
        RefreshTrainingModuleUi();

        int score = TrainingReadinessScore();
        label = NamedLabel(trainingReadinessCard, "trainingReadinessValueLabel");
        if (label != null)
        {
            label.Text = score + " / 100";
            label.ForeColor = score >= 72 ? theme.Success : score >= 48 ? theme.Warn : theme.Muted;
        }
        label = NamedLabel(trainingReadinessCard, "trainingReadinessDescLabel");
        if (label != null) label.Text = score >= 72 ? T("trainingReady") : score >= 48 ? T("trainingWarmup") : T("trainingResetHint");

        StylePageButtons(theme);
        StylePageButton(trainingGoalSurviveButton, trainingGoal == "survive", theme);
        StylePageButton(trainingGoalFinishButton, trainingGoal == "finish", theme);
        StylePageButton(trainingGoalRotateButton, trainingGoal == "rotate", theme);
        StylePageButton(trainingGoalCommsButton, trainingGoal == "comms", theme);
        StyleSecondaryButton(trainingResetButton, theme);
        StyleCheckBox(trainingDropCheck, theme);
        StyleCheckBox(trainingRotateCheck, theme);
        StyleCheckBox(trainingPushCheck, theme);
        StyleCheckBox(trainingRegainCheck, theme);
        StyleCheckBox(trainingTiltCheck, theme);

        if (trainingZoneRisk == null || trainingZoneRisk.Length != 4) trainingZoneRisk = new int[] { 2, 1, 1, 0 };
        SetTrainingZoneButton(trainingZoneAButton, T("trainingZonePrison"), trainingZoneRisk[0], theme);
        SetTrainingZoneButton(trainingZoneBButton, T("trainingZoneHQ"), trainingZoneRisk[1], theme);
        SetTrainingZoneButton(trainingZoneCButton, T("trainingZoneStation"), trainingZoneRisk[2], theme);
        SetTrainingZoneButton(trainingZoneDButton, T("trainingZoneRiver"), trainingZoneRisk[3], theme);
    }

    private void SetTrainingZoneButton(Button button, string label, int risk, WzTheme theme)
    {
        if (button == null) return;
        button.Text = label + " " + TrainingRiskLabel(risk);
        button.BackColor = risk == 2 ? theme.Warn : risk == 1 ? theme.SurfaceAlt : theme.Surface;
        button.ForeColor = risk == 2 ? theme.Canvas : theme.Ink;
        button.FlatAppearance.BorderColor = risk == 2 ? theme.Warn : theme.Line;
        button.FlatAppearance.MouseOverBackColor = button.BackColor;
        button.FlatAppearance.MouseDownBackColor = ControlPaint.Dark(button.BackColor);
    }

    private bool populatingCombos;

    private void PopulateClipCombos()
    {
        populatingCombos = true;
        try
        {
            if (clipModeCombo != null)
            {
                clipModeCombo.Items.Clear();
                clipModeCombo.Items.Add(T("modeSocial"));
                clipModeCombo.Items.Add(T("modeRaw"));
                clipModeCombo.Items.Add(T("modeFull"));
                clipModeCombo.Items.Add(T("modeAsk"));
                clipModeCombo.SelectedIndex = clipMode == "raw" ? 1 : clipMode == "full" ? 2 : clipMode == "ask" ? 3 : 0;
            }
            if (socialFormatCombo != null)
            {
                socialFormatCombo.Items.Clear();
                socialFormatCombo.Items.Add(T("fmtVertical"));
                socialFormatCombo.Items.Add(T("fmtSquare"));
                socialFormatCombo.Items.Add(T("fmtHorizontal"));
                socialFormatCombo.SelectedIndex = socialFormat == "square" ? 1 : socialFormat == "horizontal" ? 2 : 0;
                socialFormatCombo.Enabled = clipMode == "social" || clipMode == "ask";
            }
        }
        finally
        {
            populatingCombos = false;
        }
    }

    private void OnClipModeChanged()
    {
        if (populatingCombos || clipModeCombo == null) return;
        int i = clipModeCombo.SelectedIndex;
        clipMode = i == 1 ? "raw" : i == 2 ? "full" : i == 3 ? "ask" : "social";
        if (socialFormatCombo != null) socialFormatCombo.Enabled = clipMode == "social" || clipMode == "ask";
        SaveSession();
    }

    private void OnSocialFormatChanged()
    {
        if (populatingCombos || socialFormatCombo == null) return;
        int i = socialFormatCombo.SelectedIndex;
        socialFormat = i == 1 ? "square" : i == 2 ? "horizontal" : "vertical";
        SaveSession();
    }

    private void OnHighlightsChanged()
    {
        // Premium gate: only paid accounts can enable the premium auto-clips feature.
        if (highlightsToggle.Checked && !premiumAccessActive)
        {
            highlightsToggle.Checked = false; // re-enters this handler with Checked == false
            premiumAccessStatusLabel.Text = T("premiumInactive");
            premiumAccessStatusLabel.ForeColor = Theme.Muted;
            // Clear feedback (the log is hidden on this page) + re-check access in case it is active.
            if (string.IsNullOrWhiteSpace(deviceToken))
            {
                MessageBox.Show(T("clipsNeedConnect"), "WZPRO Companion");
            }
            else
            {
                MessageBox.Show(T("clipsNeedPremium"), "WZPRO Companion");
                backgroundPremiumCheck = CheckPremiumAccess(true);
            }
            return;
        }

        highlightsProEnabled = highlightsToggle.Checked;
        highlightsStatusLabel.Text = highlightsProEnabled ? T("highlightsStatusOn") : T("highlightsStatusOff");
        highlightsStatusLabel.ForeColor = highlightsProEnabled ? Theme.Warn : Theme.Muted;
        RefreshClipsFolderUi();
        SaveSession();
    }

    private string DefaultClipsFolder()
    {
        string videos = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
        if (string.IsNullOrWhiteSpace(videos)) videos = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        return Path.Combine(videos, "WZPRO Clips");
    }

    private string EffectiveClipsFolder()
    {
        return string.IsNullOrWhiteSpace(clipsFolderPath) ? DefaultClipsFolder() : clipsFolderPath;
    }

    private void RefreshClipsFolderUi()
    {
        if (clipsFolderValueLabel == null) return;
        clipsFolderValueLabel.Text = string.IsNullOrWhiteSpace(clipsFolderPath) ? T("clipsFolderUnset") : clipsFolderPath;
        if (clipsOpenFolderButton != null) clipsOpenFolderButton.Enabled = true;
    }

    private void ChooseClipsFolder()
    {
        using (var dialog = new FolderBrowserDialog())
        {
            dialog.Description = T("clipsFolderTitle");
            dialog.SelectedPath = EffectiveClipsFolder();
            if (dialog.ShowDialog(this) != DialogResult.OK) return;
            try
            {
                Directory.CreateDirectory(dialog.SelectedPath);
                clipsFolderPath = dialog.SelectedPath;
                RefreshClipsFolderUi();
                SaveSession();
                AddLogLine(T("clipsFolderSaved") + clipsFolderPath);
            }
            catch (Exception ex)
            {
                AddLogLine(T("clipsFolderError") + ex.Message);
                MessageBox.Show(T("clipsFolderError") + ex.Message, "WZPRO Companion");
            }
        }
    }

    private void ChooseMusic()
    {
        using (var dialog = new OpenFileDialog())
        {
            dialog.Filter = "Audio|*.mp3;*.m4a;*.aac;*.wav;*.ogg;*.flac|All files|*.*";
            if (!string.IsNullOrWhiteSpace(musicPath)) { try { dialog.InitialDirectory = Path.GetDirectoryName(musicPath); } catch { } }
            if (dialog.ShowDialog(this) != DialogResult.OK) return;
            musicPath = dialog.FileName;
            RefreshMusicUi();
            SaveSession();
        }
    }

    private void RefreshMusicUi()
    {
        if (musicLabel == null) return;
        musicLabel.Text = string.IsNullOrWhiteSpace(musicPath) ? T("musicNone") : Path.GetFileName(musicPath);
    }

    private void RefreshAudioUi()
    {
        if (audioButton == null) return;
        bool on = !string.IsNullOrEmpty(systemAudioDevice) || !string.IsNullOrEmpty(micAudioDevice);
        audioButton.Text = T("audioButton") + (on ? " *" : "");
    }

    private System.Collections.Generic.List<string> EnumerateAudioDevices()
    {
        var list = new System.Collections.Generic.List<string>();
        ResolveFfmpeg();
        if (string.IsNullOrEmpty(ffmpegPath)) return list;
        try
        {
            var p = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = ffmpegPath,
                    Arguments = "-hide_banner -list_devices true -f dshow -i dummy",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardError = true,
                    RedirectStandardOutput = true
                }
            };
            p.Start();
            string err = p.StandardError.ReadToEnd();
            p.WaitForExit(8000);
            foreach (Match m in Regex.Matches(err, "\"([^\"]+)\"\\s*\\(audio\\)"))
            {
                string name = m.Groups[1].Value;
                if (!list.Contains(name)) list.Add(name);
            }
        }
        catch { }
        return list;
    }

    // Multitrack audio for full-game recordings: pick a system-audio (loopback) device and a mic.
    private void OpenAudioSettings()
    {
        System.Collections.Generic.List<string> devices = EnumerateAudioDevices();
        using (var dlg = new Form
        {
            Text = T("audioTitle"),
            FormBorderStyle = FormBorderStyle.FixedDialog,
            StartPosition = FormStartPosition.CenterParent,
            Size = new Size(470, 246),
            MaximizeBox = false,
            MinimizeBox = false,
            BackColor = Color.FromArgb(12, 14, 22)
        })
        {
            var lblSys = new Label { Text = T("audioSystem"), Location = new Point(16, 16), Size = new Size(424, 18), ForeColor = Color.White, Font = AppFont(8, FontStyle.Bold) };
            var cbSys = new ComboBox { Location = new Point(16, 38), Size = new Size(424, 24), DropDownStyle = ComboBoxStyle.DropDownList, BackColor = Color.FromArgb(14, 18, 45), ForeColor = Color.White };
            var lblMic = new Label { Text = T("audioMic"), Location = new Point(16, 76), Size = new Size(424, 18), ForeColor = Color.White, Font = AppFont(8, FontStyle.Bold) };
            var cbMic = new ComboBox { Location = new Point(16, 98), Size = new Size(424, 24), DropDownStyle = ComboBoxStyle.DropDownList, BackColor = Color.FromArgb(14, 18, 45), ForeColor = Color.White };
            cbSys.Items.Add(T("audioNone"));
            cbMic.Items.Add(T("audioNone"));
            foreach (string d in devices) { cbSys.Items.Add(d); cbMic.Items.Add(d); }
            int si = cbSys.Items.IndexOf(systemAudioDevice);
            cbSys.SelectedIndex = si > 0 ? si : 0;
            int mi = cbMic.Items.IndexOf(micAudioDevice);
            cbMic.SelectedIndex = mi > 0 ? mi : 0;
            var hint = new Label { Text = T("audioHint"), Location = new Point(16, 132), Size = new Size(424, 32), ForeColor = Color.FromArgb(150, 150, 155), Font = AppFont(7, FontStyle.Regular) };
            var ok = new Button { Text = T("audioSave"), Location = new Point(232, 174), Size = new Size(104, 32), DialogResult = DialogResult.OK, BackColor = Color.FromArgb(22, 60, 255), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            var cancel = new Button { Text = T("audioCancel"), Location = new Point(344, 174), Size = new Size(96, 32), DialogResult = DialogResult.Cancel, BackColor = Color.FromArgb(42, 42, 48), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            dlg.Controls.Add(lblSys);
            dlg.Controls.Add(cbSys);
            dlg.Controls.Add(lblMic);
            dlg.Controls.Add(cbMic);
            dlg.Controls.Add(hint);
            dlg.Controls.Add(ok);
            dlg.Controls.Add(cancel);
            dlg.AcceptButton = ok;
            dlg.CancelButton = cancel;
            if (dlg.ShowDialog(this) == DialogResult.OK)
            {
                systemAudioDevice = cbSys.SelectedIndex <= 0 ? "" : (string)cbSys.SelectedItem;
                micAudioDevice = cbMic.SelectedIndex <= 0 ? "" : (string)cbMic.SelectedItem;
                RefreshAudioUi();
                SaveSession();
                AddLogLine(T("audioSaved"));
            }
        }
    }

    private void OpenClipsFolder()
    {
        try
        {
            string folder = EffectiveClipsFolder();
            Directory.CreateDirectory(folder);
            OpenUrl(folder);
        }
        catch (Exception ex)
        {
            AddLogLine(T("clipsFolderError") + ex.Message);
            MessageBox.Show(T("clipsFolderError") + ex.Message, "WZPRO Companion");
        }
    }

    private void OpenPremiumAccessPage()
    {
        OpenUrl(site + "/companion/premium");
    }

    private void SafeUi(Action action)
    {
        if (IsDisposed) return;
        try
        {
            if (InvokeRequired) BeginInvoke(action);
            else action();
        }
        catch
        {
            // The form may be closing while a network check finishes.
        }
    }

    private void RefreshPremiumAccessUi()
    {
        if (premiumAccessStatusLabel == null) return;
        premiumAccessStatusLabel.Text = premiumAccessActive ? T("premiumActive") : T("premiumInactive");
        premiumAccessStatusLabel.ForeColor = premiumAccessActive ? Theme.Success : Theme.Muted;
        highlightsStatusLabel.Text = premiumAccessActive ? T("premiumActive") : highlightsProEnabled ? T("highlightsStatusOn") : T("highlightsStatusOff");
        highlightsStatusLabel.ForeColor = premiumAccessActive ? Theme.Success : highlightsProEnabled ? Theme.Warn : Theme.Muted;
    }

    private async Task CheckPremiumAccess(bool userRequested)
    {
        if (premiumCheckRunning || string.IsNullOrWhiteSpace(deviceToken)) return;
        premiumCheckRunning = true;
        if (premiumAccessStatusLabel != null)
        {
            premiumAccessStatusLabel.Text = T("premiumChecking");
            premiumAccessStatusLabel.ForeColor = Theme.Info;
        }
        if (premiumRefreshButton != null) premiumRefreshButton.Enabled = false;

        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Get, site + "/api/companion/premium/status"))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", deviceToken);
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!response.IsSuccessStatusCode) throw new Exception(body);
                    premiumAccessActive = JsonBool(body, "premium");
                    lastPremiumCheckUtc = DateTime.UtcNow;
                    SafeUi(delegate
                    {
                        // Premium lost/never granted: turn off any premium feature left enabled.
                        if (!premiumAccessActive && highlightsProEnabled)
                        {
                            highlightsProEnabled = false;
                            if (highlightsToggle != null) highlightsToggle.Checked = false;
                            SaveSession();
                        }
                        RefreshPremiumAccessUi();
                        if (userRequested) AddLogLine(premiumAccessActive ? T("premiumActive") : T("premiumInactive"));
                    });
                }
            }
        }
        catch (Exception ex)
        {
            SafeUi(delegate
            {
                if (premiumAccessStatusLabel != null)
                {
                    premiumAccessStatusLabel.Text = T("premiumCheckFailed") + ex.Message;
                    premiumAccessStatusLabel.ForeColor = Theme.Warn;
                }
                if (userRequested) AddLogLine(T("premiumCheckFailed") + ex.Message);
            });
        }
        finally
        {
            premiumCheckRunning = false;
            SafeUi(delegate { if (premiumRefreshButton != null) premiumRefreshButton.Enabled = true; });
        }
    }

    // Free home data: meta of the day, daily settings tip and latest patch note.
    private async Task FetchHomeData()
    {
        if (string.IsNullOrWhiteSpace(deviceToken)) return;
        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Get, site + "/api/companion/home"))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", deviceToken);
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!response.IsSuccessStatusCode) return;

                    string weapon = JsonString(body, "weapon");
                    string tier = JsonString(body, "tier");
                    string category = JsonString(body, "category");
                    string tip = JsonString(body, "tip");
                    string patch = JsonString(body, "summary");
                    string patchDate = JsonString(body, "date");

                    SafeUi(delegate
                    {
                        if (!string.IsNullOrWhiteSpace(weapon)) metaTodayWeapon = weapon;
                        if (metaTodayLabel != null && !string.IsNullOrWhiteSpace(weapon))
                        {
                            string line = T("metaToday") + weapon;
                            if (!string.IsNullOrWhiteSpace(tier)) line += " (" + tier + ")";
                            if (!string.IsNullOrWhiteSpace(category)) line += " - " + category;
                            metaTodayLabel.Text = line;
                        }
                        if (!homeFetched)
                        {
                            homeFetched = true;
                            if (!string.IsNullOrWhiteSpace(tip)) AddLogLine(T("tipPrefix") + tip);
                            if (!string.IsNullOrWhiteSpace(patch))
                            {
                                string patchLine = T("patchPrefix") + patch;
                                if (!string.IsNullOrWhiteSpace(patchDate)) patchLine += " (" + patchDate + ")";
                                AddLogLine(patchLine);
                            }
                        }
                    });
                }
            }
        }
        catch
        {
            // Home data is best-effort; ignore network/parse failures.
        }
    }

    // Premium advanced tracker + AI coach (gated server-side; 403 if not premium).
    private async Task FetchStats()
    {
        if (string.IsNullOrWhiteSpace(deviceToken)) return;
        SafeUi(delegate { if (statsBox != null) statsBox.Text = T("statsLoading"); });
        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Get, site + "/api/companion/stats"))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", deviceToken);
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                    {
                        SafeUi(delegate { if (statsBox != null) statsBox.Text = T("premiumInactive"); });
                        return;
                    }
                    if (!response.IsSuccessStatusCode)
                    {
                        SafeUi(delegate { if (statsBox != null) statsBox.Text = T("statsFailed"); });
                        return;
                    }

                    string level = JsonString(body, "level");
                    string kd = JsonNumber(body, "kd");
                    string kills = JsonNumber(body, "kills");
                    string dmg = JsonNumber(body, "damage");
                    string wr = JsonNumber(body, "winRate");
                    string pct = JsonNumber(body, "percentile");
                    System.Collections.Generic.List<string> coach = JsonStringArray(body, "coach");

                    SafeUi(delegate
                    {
                        if (statsBox == null) return;
                        var sb = new System.Text.StringBuilder();
                        sb.AppendLine(T("statsLevel") + level + " (top " + pct + "%)");
                        sb.AppendLine("K/D " + kd + "  -  " + kills + " kills  -  " + dmg + " dmg  -  " + wr + "% win");
                        sb.AppendLine("");
                        foreach (string tip in coach) sb.AppendLine("- " + tip);
                        statsBox.Text = sb.ToString();
                    });
                }
            }
        }
        catch
        {
            SafeUi(delegate { if (statsBox != null) statsBox.Text = T("statsFailed"); });
        }
    }

    private static string JsonNumber(string json, string key)
    {
        Match match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)");
        return match.Success ? match.Groups[1].Value : "";
    }

    private static System.Collections.Generic.List<string> JsonStringArray(string json, string key)
    {
        var list = new System.Collections.Generic.List<string>();
        Match arr = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\\[(.*?)\\]", RegexOptions.Singleline);
        if (!arr.Success) return list;
        foreach (Match m in Regex.Matches(arr.Groups[1].Value, "\"((?:\\\\.|[^\"])*)\""))
        {
            list.Add(Regex.Unescape(m.Groups[1].Value));
        }
        return list;
    }

    // In-game overlay HUD (free): draggable, topmost, shows session totals + meta of the day.
    private void ToggleOverlay()
    {
        EnsureOverlay();
        if (overlayForm.Visible)
        {
            overlayForm.Hide();
        }
        else
        {
            UpdateOverlay();
            overlayForm.Show();
        }
    }

    private void EnsureOverlay()
    {
        if (overlayForm != null) return;
        overlayForm = new Form
        {
            FormBorderStyle = FormBorderStyle.None,
            StartPosition = FormStartPosition.Manual,
            TopMost = true,
            ShowInTaskbar = false,
            BackColor = Color.Black,
            Opacity = 0.78,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            MinimumSize = new Size(200, 30),
            Location = new Point(24, 24)
        };
        overlayLabel = new Label
        {
            AutoSize = true,
            ForeColor = Color.White,
            Font = AppFont(9, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft,
            Padding = new Padding(12, 8, 12, 8)
        };
        overlayLabel.MouseDown += delegate(object s, MouseEventArgs e) { overlayDragStart = e.Location; overlayDragging = true; };
        overlayLabel.MouseUp += delegate { overlayDragging = false; };
        overlayLabel.MouseMove += delegate(object s, MouseEventArgs e)
        {
            if (overlayDragging)
            {
                overlayForm.Location = new Point(overlayForm.Location.X + e.X - overlayDragStart.X, overlayForm.Location.Y + e.Y - overlayDragStart.Y);
            }
        };
        overlayForm.Controls.Add(overlayLabel);
    }

    private void UpdateOverlay()
    {
        // Don't resize/repaint mid-drag (the AutoSize form would jitter under the cursor).
        if (overlayLabel == null || overlayDragging) return;
        UpdatePerfSample();
        int mins = sessionStartUtc == default(DateTime)
            ? 0
            : Math.Max(0, (int)Math.Round(DateTime.UtcNow.Subtract(sessionStartUtc).TotalMinutes));
        string meta = string.IsNullOrWhiteSpace(metaTodayWeapon) ? "" : Environment.NewLine + T("metaToday") + metaTodayWeapon;
        // RAM is valid from the first sample; CPU needs two samples, so show "--" until ready.
        string perf = perfRam >= 0
            ? Environment.NewLine + "CPU " + (perfCpu >= 0 ? perfCpu.ToString() : "--") + "%  RAM " + perfRam + "%"
            : "";
        string highlights = (premiumAccessActive && sessionHighlightCount > 0)
            ? Environment.NewLine + T("overlayHighlights") + sessionHighlightCount
            : "";
        // Show the replay-key reminder only until the player has used it once.
        string replay = (premiumAccessActive && manualReplayHotkeyRegistered && lastManualReplayUtc == DateTime.MinValue)
            ? Environment.NewLine + T("overlayReplay") + activeReplayHotkeyLabel
            : "";
        overlayLabel.Text = "WZPRO" + Environment.NewLine + T("overlayGames") + sessionGameCount + "  /  " + mins + " min" + highlights + meta + perf + replay;
    }

    // Sample CPU% (busy share of system time deltas) and RAM% (memory load) cheaply.
    private void UpdatePerfSample()
    {
        try
        {
            FileTime64 idle, kernel, user;
            if (GetSystemTimes(out idle, out kernel, out user))
            {
                ulong i = ((ulong)idle.High << 32) | idle.Low;
                ulong k = ((ulong)kernel.High << 32) | kernel.Low;
                ulong u = ((ulong)user.High << 32) | user.Low;
                if (lastKernelTime != 0 || lastUserTime != 0)
                {
                    ulong total = (k - lastKernelTime) + (u - lastUserTime);
                    ulong busy = total - (i - lastIdleTime); // idle is included in kernel time
                    if (total > 0) perfCpu = (int)Math.Min(100UL, busy * 100UL / total);
                }
                lastIdleTime = i;
                lastKernelTime = k;
                lastUserTime = u;
            }
            MemoryStatusEx mem = new MemoryStatusEx();
            mem.dwLength = (uint)Marshal.SizeOf(typeof(MemoryStatusEx));
            if (GlobalMemoryStatusEx(ref mem)) perfRam = (int)mem.dwMemoryLoad;
        }
        catch
        {
            // Perf readout is cosmetic; never let it break the overlay.
        }
    }

    // Highlight emitted by the Node engine ("HIGHLIGHT {json}"): log it, and on premium
    // with clips enabled, write a marker and trigger a Windows Game Bar capture.
    private void HandleHighlight(string json)
    {
        string reason = JsonString(json, "reason");
        string kills = JsonNumber(json, "kills");
        string place = JsonNumber(json, "placement");
        string damage = JsonNumber(json, "damage");
        bool won = JsonBool(json, "won");

        string label =
            reason == "dominant" ? T("highlightDominant") :
            reason == "win" ? T("highlightWin") :
            reason == "top3" ? T("highlightTop3") :
            reason == "bigdamage" ? T("highlightBigDamage") :
            T("highlightMultikill");
        string detail = T("highlightDetected") + label + " (" + kills + " kills"
            + (!string.IsNullOrWhiteSpace(place) && place != "0" ? ", #" + place : "")
            + (!string.IsNullOrWhiteSpace(damage) && damage != "0" ? ", " + damage + " dmg" : "") + ")";
        if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] * " + detail + Environment.NewLine);

        if (!premiumAccessActive || !highlightsProEnabled) return;

        sessionHighlightCount++;
        if (overlayLabel != null) UpdateOverlay();

        try
        {
            string dir = EffectiveClipsFolder();
            Directory.CreateDirectory(dir);
            File.AppendAllText(
                Path.Combine(dir, "highlights.log"),
                DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + reason + "  kills=" + kills + "  dmg=" + damage + "  place=" + place + "  won=" + (won ? "1" : "0") + Environment.NewLine);
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("highlightSaved") + dir + Environment.NewLine);
        }
        catch (Exception ex)
        {
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("clipsFolderError") + ex.Message + Environment.NewLine);
        }

        // Prefer our own recorder buffer; fall back to Game Bar if it is not running.
        if (recorderActive && !string.IsNullOrEmpty(ffmpegPath))
        {
            // Full-game mode exports the whole match on "Uploaded game" instead of short clips.
            if (clipMode != "full")
            {
                string clip = SaveClip(reason);
                if (!string.IsNullOrEmpty(clip))
                {
                    if (clipMode == "social") sessionClips.Add(clip);
                    if (clipMode == "ask") pendingGameClips.Add(clip);
                }
            }
        }
        else
        {
            TriggerGameBarClip();
        }
    }

    private void TriggerGameBarClip()
    {
        // Win + Alt + G captures the last seconds via Game Bar (needs background recording on).
        try
        {
            const byte VK_LWIN = 0x5B, VK_MENU = 0x12, VK_G = 0x47;
            const uint KEYUP = 0x0002;
            keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
            keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
            keybd_event(VK_G, 0, 0, UIntPtr.Zero);
            keybd_event(VK_G, 0, KEYUP, UIntPtr.Zero);
            keybd_event(VK_MENU, 0, KEYUP, UIntPtr.Zero);
            keybd_event(VK_LWIN, 0, KEYUP, UIntPtr.Zero);
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("highlightClip") + Environment.NewLine);
        }
        catch
        {
            // Capture is best-effort; Game Bar may be disabled.
        }
    }

    // ── Manual instant-replay hotkey ───────────────────────────────────────────

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        // The hotkey intentionally survives tray-hide (the HWND stays alive). It is
        // re-registered if the handle is ever recreated (e.g. ShowInTaskbar toggling).
        if (!manualReplayHotkeyRegistered)
        {
            registeredHotkeyHwnd = Handle;
            activeReplayHotkeyLabel = "";
            foreach (ReplayHotkey combo in ManualReplayCandidates)
            {
                if (RegisterHotKey(registeredHotkeyHwnd, ManualReplayHotkeyId, combo.Mods | ModNoRepeat, combo.Vk))
                {
                    manualReplayHotkeyRegistered = true;
                    activeReplayHotkeyLabel = combo.Label;
                    break;
                }
            }
            AddLogLine(manualReplayHotkeyRegistered ? T("manualReplayHotkeyActive") + activeReplayHotkeyLabel : T("manualReplayHotkeyTaken"));
            ApplyManualReplayHint();
            // Tell the user the active combo once, where they can act on it.
            if (manualReplayHotkeyRegistered && !replayHotkeyToastShown)
            {
                replayHotkeyToastShown = true;
                ShowToast(T("manualReplayHotkeyActive") + activeReplayHotkeyLabel);
            }
        }
    }

    protected override void OnHandleDestroyed(EventArgs e)
    {
        if (manualReplayHotkeyRegistered)
        {
            try { UnregisterHotKey(registeredHotkeyHwnd, ManualReplayHotkeyId); } catch { }
            manualReplayHotkeyRegistered = false;
            registeredHotkeyHwnd = IntPtr.Zero;
        }
        base.OnHandleDestroyed(e);
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        if (m.Msg == 0x0312 /* WM_HOTKEY */ && m.WParam.ToInt32() == ManualReplayHotkeyId)
        {
            OnManualReplay();
        }
    }

    private void OnManualReplay()
    {
        if (!premiumAccessActive)
        {
            ShowToast(T("manualReplayPremium"));
            return;
        }
        // Debounce: back-to-back saves overlap on the same buffer segments.
        if ((DateTime.UtcNow - lastManualReplayUtc).TotalSeconds < 4) return;

        if (recorderActive && !string.IsNullOrEmpty(ffmpegPath))
        {
            string clip = SaveClip("manual");
            if (!string.IsNullOrEmpty(clip))
            {
                lastManualReplayUtc = DateTime.UtcNow;
                if (clipMode == "social") sessionClips.Add(clip);
                else if (clipMode == "ask") pendingGameClips.Add(clip);
                ShowToast(T("manualReplaySaved"));
            }
            else
            {
                ShowToast(T("manualReplayEmpty"));
            }
        }
        else if (!string.IsNullOrEmpty(ffmpegPath))
        {
            lastManualReplayUtc = DateTime.UtcNow;
            TriggerGameBarClip();
            ShowToast(T("manualReplayRequested"));
        }
        else
        {
            ShowToast(T("manualReplayNoRecorder"));
        }
    }

    // Surface the live hotkey combo in the Highlights card (reflects fallback choices).
    private void ApplyManualReplayHint()
    {
        if (highlightsDescLabel == null) return;
        string hint = manualReplayHotkeyRegistered
            ? T("manualReplayHint").Replace("{key}", activeReplayHotkeyLabel)
            : T("manualReplayHotkeyUnavailable");
        highlightsDescLabel.Text = T("highlightsDesc") + "   |   " + hint;
    }

    // A candidate global hotkey for the manual instant replay.
    private sealed class ReplayHotkey
    {
        public readonly uint Mods;
        public readonly uint Vk;
        public readonly string Label;
        public ReplayHotkey(uint mods, uint vk, string label) { Mods = mods; Vk = vk; Label = label; }
    }

    // Borderless, non-activating confirmation toast: visible over the focused game
    // without stealing its input focus.
    private sealed class NoActivateForm : Form
    {
        protected override bool ShowWithoutActivation { get { return true; } }
        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x08000000 /* WS_EX_NOACTIVATE */ | 0x00000080 /* WS_EX_TOOLWINDOW */;
                return cp;
            }
        }
    }

    private void ShowToast(string message)
    {
        try
        {
            if (toastTimer != null) { toastTimer.Stop(); toastTimer.Dispose(); toastTimer = null; }
            if (toastForm != null) { try { toastForm.Close(); toastForm.Dispose(); } catch { } toastForm = null; }

            if (toastFont == null) toastFont = AppFont(11, FontStyle.Bold);
            Label lbl = new Label
            {
                Text = message,
                AutoSize = true,
                Font = toastFont,
                ForeColor = Color.White,
                Padding = new Padding(18, 12, 18, 12),
                TextAlign = ContentAlignment.MiddleCenter
            };
            NoActivateForm form = new NoActivateForm
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition = FormStartPosition.Manual,
                ShowInTaskbar = false,
                TopMost = true,
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                BackColor = Color.FromArgb(22, 60, 255),
                Opacity = 0.96,
                Location = new Point(-10000, -10000) // offscreen until measured, avoids a flash
            };
            form.Controls.Add(lbl);
            toastForm = form;
            form.Show();
            // Now the handle exists: AutoSize has measured the label at the real DPI, and we
            // can place the toast on whatever screen the focused game is running on.
            Screen target = Screen.FromHandle(GetForegroundWindow());
            Rectangle area = (target ?? Screen.PrimaryScreen).WorkingArea;
            form.Location = new Point(area.Left + (area.Width - form.Width) / 2, area.Bottom - form.Height - 80);

            toastTimer = new Timer { Interval = 2200 };
            toastTimer.Tick += delegate
            {
                try
                {
                    if (toastTimer != null) { toastTimer.Stop(); toastTimer.Dispose(); toastTimer = null; }
                    if (toastForm != null) { toastForm.Close(); toastForm.Dispose(); toastForm = null; }
                }
                catch { }
            };
            toastTimer.Start();
        }
        catch
        {
            // Toast is purely cosmetic; never let it break a clip save.
        }
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out NativeRect rect);

    [StructLayout(LayoutKind.Sequential)]
    private struct NativeRect { public int Left; public int Top; public int Right; public int Bottom; }

    // Lightweight system perf for the overlay (CPU% from time deltas, RAM% from load).
    // FPS/GPU are intentionally out of scope: they need game present-hooking / vendor APIs.
    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime64 { public uint Low; public uint High; }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetSystemTimes(out FileTime64 idleTime, out FileTime64 kernelTime, out FileTime64 userTime);

    [StructLayout(LayoutKind.Sequential)]
    private struct MemoryStatusEx
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx(ref MemoryStatusEx lpBuffer);

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

            if (!gameFocused)
            {
                // Stop recording after a few ticks without the game in focus.
                if (recorderActive && ++noGameTicks >= 3) StopRecorder();
                return;
            }
            noGameTicks = 0;

            int w = r.Right - r.Left;
            int h = r.Bottom - r.Top;
            using (var bmp = new Bitmap(w, h))
            using (var g = Graphics.FromImage(bmp))
            {
                g.CopyFromScreen(r.Left, r.Top, 0, 0, new Size(w, h));
                bmp.Save(NativeScreenshotPath, System.Drawing.Imaging.ImageFormat.Png);
            }

            // Premium + clips: keep the rolling clip buffer running while in game.
            if (premiumAccessActive && highlightsProEnabled && !recorderActive)
            {
                StartRecorder();
            }
        }
        catch
        {
            // Best-effort; the engine falls back to its own capture if this frame is stale.
        }
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
            recorderProcess.ErrorDataReceived += delegate { };
            recorderProcess.OutputDataReceived += delegate { };
            recorderProcess.Exited += delegate
            {
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
                    }
                }
            };
            recorderProcess.Start();
            recorderProcess.BeginErrorReadLine();
            recorderProcess.BeginOutputReadLine();
            recorderActive = true;
            try { recorderProcess.PriorityClass = ProcessPriorityClass.BelowNormal; } catch { }
        }
        catch (Exception ex)
        {
            ffmpegPath = "";
            recorderActive = false;
            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("recorderUnavailable") + ex.Message + Environment.NewLine);
        }
    }

    private void StopRecorder()
    {
        recorderActive = false;
        noGameTicks = 0;
        if (recorderProcess != null && !recorderProcess.HasExited)
        {
            try { recorderProcess.Kill(); recorderProcess.WaitForExit(1500); } catch { }
        }
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

            // Exclude the newest segment (still being written), keep up to ~30s before it.
            int end = segs.Length - 1;
            int start = Math.Max(0, end - 10);
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
            SafeUi(delegate { if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("montageSaved") + saved + Environment.NewLine); });
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

            // AI coach summary derived from the game numbers (honest: stats-based, not video analysis).
            string coachPath = Path.Combine(clipDir, "game_" + stamp + "_coach.txt");
            File.WriteAllText(coachPath, BuildCoachText(uploadedLine));

            if (logBox != null) logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + T("fullGameSaved") + outPath + Environment.NewLine);

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
            endGameTimer.Tick += delegate { ChooseEndGame("skip"); };
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
        var social = new Button { Name = "egSocial", Location = new Point(16, 60), Size = new Size(146, 40), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(22, 60, 255), ForeColor = Color.White, Font = AppFont(8, FontStyle.Bold) };
        social.Click += delegate { ChooseEndGame("social"); };
        var coach = new Button { Name = "egCoach", Location = new Point(168, 60), Size = new Size(146, 40), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(42, 42, 48), ForeColor = Color.White, Font = AppFont(8, FontStyle.Bold) };
        coach.Click += delegate { ChooseEndGame("coach"); };
        var skip = new Button { Name = "egSkip", Location = new Point(16, 110), Size = new Size(298, 28), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(20, 20, 26), ForeColor = Color.FromArgb(170, 170, 175), Font = AppFont(7, FontStyle.Regular) };
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
        pendingGameClips.Clear();
        ClearBuffer();
    }

    private void HideEndGameChoice()
    {
        if (endGameForm != null) endGameForm.Hide();
    }

    private void ClearBuffer()
    {
        try { foreach (string f in Directory.GetFiles(BufferDir, "seg_*.ts")) { try { File.Delete(f); } catch { } } } catch { }
    }

    private void ShowProfileMenu()
    {
        if (profileMenu == null || profilePanel == null) return;
        profileMenu.Show(profilePanel, new Point(0, -profileMenu.Height));
    }

    private void OpenProfileSettings()
    {
        OpenUrl(site + "/account#public-profile-settings");
    }

    private void LogoutProfile()
    {
        StopCompanion();
        deviceToken = "";
        connectedName = "";
        profilePictureUrl = "";
        deviceCode = "";
        deviceId = "";
        pollingLogin = false;
        if (loginPollTimer != null) loginPollTimer.Stop();
        SaveSession();
        RefreshConnectionUi();
        RefreshProfileUi();
        ShowWelcome();
    }

    private void RefreshProfileUi()
    {
        if (profileNameLabel == null || profilePictureBox == null) return;
        string name = string.IsNullOrWhiteSpace(connectedName) ? T("profileGuest") : connectedName;
        profileNameLabel.Text = name;
        profilePictureBox.Image = BuildAvatarImage(name);
        if (!string.IsNullOrWhiteSpace(profilePictureUrl))
        {
            Task.Run(async delegate { await LoadProfilePicture(profilePictureUrl); });
        }
    }

    private Bitmap BuildAvatarImage(string name)
    {
        var theme = Theme;
        var bitmap = new Bitmap(38, 38);
        using (Graphics g = Graphics.FromImage(bitmap))
        using (SolidBrush bg = new SolidBrush(theme.Blue))
        using (SolidBrush fg = new SolidBrush(theme.BlueText))
        using (Font font = AppFont(10, FontStyle.Bold))
        {
            g.Clear(theme.Surface);
            g.FillEllipse(bg, 1, 1, 36, 36);
            string initials = Initials(name);
            SizeF size = g.MeasureString(initials, font);
            g.DrawString(initials, font, fg, (38 - size.Width) / 2, (38 - size.Height) / 2);
        }
        return bitmap;
    }

    private static string Initials(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "WZ";
        string[] parts = name.Trim().Split(new[] { ' ', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2) return (parts[0].Substring(0, 1) + parts[1].Substring(0, 1)).ToUpperInvariant();
        return name.Trim().Substring(0, Math.Min(2, name.Trim().Length)).ToUpperInvariant();
    }

    private async Task LoadProfilePicture(string value)
    {
        try
        {
            byte[] bytes;
            if (value.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
            {
                int comma = value.IndexOf(',');
                if (comma < 0) return;
                bytes = Convert.FromBase64String(value.Substring(comma + 1));
            }
            else
            {
                bytes = await http.GetByteArrayAsync(value);
            }

            using (var stream = new MemoryStream(bytes))
            {
                Image image = Image.FromStream(stream);
                if (profilePictureBox != null && !profilePictureBox.IsDisposed)
                {
                    profilePictureBox.BeginInvoke(new Action(delegate { profilePictureBox.Image = image; }));
                }
            }
        }
        catch
        {
            // Avatar initials remain as fallback.
        }
    }

    private void ApplyLanguage()
    {
        Text = "WZPRO Companion v" + AppVersion;
        titleLabel.Text = T("title");
        leadLabel.Text = T("lead");
        freeAccessButton.Text = T("freeAccess");
        premiumButton.Text = T("premiumAccess");
        trainingButton.Text = T("trainingAccess");
        freePageTitleLabel.Text = T("freePageTitle");
        freePageDescLabel.Text = T("freePageDesc");
        premiumPageTitleLabel.Text = T("premiumPageTitle");
        premiumPageDescLabel.Text = T("premiumPageDesc");
        profileSettingsItem.Text = T("goSettings");
        profileLogoutItem.Text = T("logout");
        welcomeKickerLabel.Text = T("welcomeKicker");
        welcomeTitleLabel.Text = T("welcomeTitle");
        welcomeSubtitleLabel.Text = T("welcomeSubtitle");
        welcomeStatsLabel.Text = T("welcomeStats");
        welcomeLoginTitleLabel.Text = T("welcomeLoginTitle");
        welcomeConnectButton.Text = T("welcomeConnect");
        welcomeSiteButton.Text = T("welcomeSite");
        welcomeLoginStatusLabel.Text = pollingLogin ? T("connecting") : T("welcomeStatus");
        RefreshProfileUi();
        verifyLabel.Text = T("verifyEvery");
        secondsLabel.Text = T("seconds");
        startButton.Text = T("start");
        stopButton.Text = T("stop");
        hintLabel.Text = T("hint");
        highlightsTitleLabel.Text = T("highlightsTitle");
        highlightsToggle.Text = T("highlightsToggle");
        ApplyManualReplayHint();
        highlightsStatusLabel.Text = highlightsProEnabled ? T("highlightsStatusOn") : T("highlightsStatusOff");
        clipsFolderTitleLabel.Text = T("clipsFolderTitle");
        clipsFolderButton.Text = T("clipsFolderChoose");
        clipsOpenFolderButton.Text = T("clipsFolderOpen");
        premiumCheckoutHintLabel.Text = T("premiumCheckoutHint");
        premiumCheckoutButton.Text = T("premiumCheckout");
        premiumRefreshButton.Text = T("premiumRefresh");
        if (statsButton != null) statsButton.Text = T("statsButton");
        if (gameBarButton != null) gameBarButton.Text = T("gameBar");
        if (overlayButton != null) overlayButton.Text = T("overlayButton");
        if (musicButton != null) musicButton.Text = T("musicButton");
        RefreshMusicUi();
        RefreshAudioUi();
        PopulateClipCombos();
        RefreshPremiumAccessUi();
        RefreshClipsFolderUi();
        RefreshTrainingUi();
        importsLabel.Text = T("imports");
        journalLabel.Text = T("journal");
        themeButton.Text = themeMode == "light" ? T("themeDark") : T("themeLight");

        updatingLanguageUi = true;
        languageBox.SelectedItem = languageCode.ToUpperInvariant();
        welcomeLanguageBox.SelectedItem = languageCode.ToUpperInvariant();
        updatingLanguageUi = false;

        if (trayShowItem != null) trayShowItem.Text = T("show");
        if (trayStartItem != null) trayStartItem.Text = T("start");
        if (trayStopItem != null) trayStopItem.Text = T("stop");
        if (trayQuitItem != null) trayQuitItem.Text = T("quit");
        if (tray != null && !IsRunning) tray.Text = T("trayStopped");
        ShowPage(activePage);
    }

    private void ApplyTheme()
    {
        var theme = Theme;
        BackColor = theme.Canvas;
        ForeColor = theme.Ink;
        if (sidebarPanel != null) sidebarPanel.BackColor = theme.SurfaceAlt;
        if (mainPanel != null) mainPanel.BackColor = theme.Canvas;
        if (welcomePanel != null) welcomePanel.BackColor = theme.Canvas;
        if (welcomeLoginPanel != null) welcomeLoginPanel.BackColor = theme.Surface;
        if (freeInfoCard != null) freeInfoCard.BackColor = theme.Surface;
        if (freeConnectionCard != null) freeConnectionCard.BackColor = theme.Surface;
        if (freeControlsCard != null) freeControlsCard.BackColor = theme.Surface;
        if (premiumInfoCard != null) premiumInfoCard.BackColor = theme.Surface;
        if (premiumHighlightsCard != null) premiumHighlightsCard.BackColor = theme.Surface;
        if (premiumClipsCard != null) premiumClipsCard.BackColor = theme.Surface;
        if (premiumAccessCard != null) premiumAccessCard.BackColor = theme.Surface;
        if (premiumAdvancedCard != null) premiumAdvancedCard.BackColor = theme.Surface;
        if (trainingInfoCard != null) trainingInfoCard.BackColor = theme.Surface;
        if (trainingGoalCard != null) trainingGoalCard.BackColor = theme.Surface;
        if (trainingReviewCard != null) trainingReviewCard.BackColor = theme.Surface;
        if (trainingReadinessCard != null) trainingReadinessCard.BackColor = theme.Surface;
        if (trainingHeatmapCard != null) trainingHeatmapCard.BackColor = theme.Surface;
        if (trainingCategoryCard != null) trainingCategoryCard.BackColor = theme.Surface;
        if (trainingModuleCard != null) trainingModuleCard.BackColor = theme.Surface;
        if (profilePanel != null) profilePanel.BackColor = theme.SurfaceAlt;
        if (profileNameLabel != null) profileNameLabel.ForeColor = theme.Ink;
        if (profilePictureBox != null) profilePictureBox.BackColor = Color.Transparent;
        if (profileMenu != null)
        {
            profileMenu.BackColor = theme.SurfaceAlt;
            profileMenu.ForeColor = theme.Ink;
        }

        ApplyThemeToControls(Controls, theme);

        if (sidebarPanel != null) sidebarPanel.BackColor = theme.SurfaceAlt;
        if (mainPanel != null) mainPanel.BackColor = theme.Canvas;
        if (welcomePanel != null) welcomePanel.BackColor = theme.Canvas;
        if (welcomeLoginPanel != null) welcomeLoginPanel.BackColor = theme.Surface;
        if (freeInfoCard != null) freeInfoCard.BackColor = theme.Surface;
        if (freeConnectionCard != null) freeConnectionCard.BackColor = theme.Surface;
        if (freeControlsCard != null) freeControlsCard.BackColor = theme.Surface;
        if (premiumInfoCard != null) premiumInfoCard.BackColor = theme.Surface;
        if (premiumHighlightsCard != null) premiumHighlightsCard.BackColor = theme.Surface;
        if (premiumClipsCard != null) premiumClipsCard.BackColor = theme.Surface;
        if (premiumAccessCard != null) premiumAccessCard.BackColor = theme.Surface;
        if (premiumAdvancedCard != null) premiumAdvancedCard.BackColor = theme.Surface;
        if (trainingInfoCard != null) trainingInfoCard.BackColor = theme.Surface;
        if (trainingGoalCard != null) trainingGoalCard.BackColor = theme.Surface;
        if (trainingReviewCard != null) trainingReviewCard.BackColor = theme.Surface;
        if (trainingReadinessCard != null) trainingReadinessCard.BackColor = theme.Surface;
        if (trainingHeatmapCard != null) trainingHeatmapCard.BackColor = theme.Surface;
        if (trainingCategoryCard != null) trainingCategoryCard.BackColor = theme.Surface;
        if (trainingModuleCard != null) trainingModuleCard.BackColor = theme.Surface;
        if (profilePanel != null) profilePanel.BackColor = theme.SurfaceAlt;
        if (profileNameLabel != null) profileNameLabel.ForeColor = theme.Ink;
        if (profilePictureBox != null) profilePictureBox.BackColor = Color.Transparent;
        titleLabel.ForeColor = theme.Blue;
        welcomeKickerLabel.ForeColor = theme.Blue;
        welcomeTitleLabel.ForeColor = theme.Ink;
        welcomeSubtitleLabel.ForeColor = theme.Muted;
        welcomeStatsLabel.ForeColor = theme.Ink;
        welcomeLoginTitleLabel.ForeColor = theme.Ink;
        welcomeLoginStatusLabel.ForeColor = theme.Muted;
        leadLabel.ForeColor = theme.Muted;
        freePageTitleLabel.ForeColor = theme.Ink;
        freePageDescLabel.ForeColor = theme.Muted;
        premiumPageTitleLabel.ForeColor = theme.Ink;
        premiumPageDescLabel.ForeColor = theme.Muted;
        hintLabel.ForeColor = theme.Muted;
        verifyLabel.ForeColor = theme.Ink;
        secondsLabel.ForeColor = theme.Ink;
        highlightsTitleLabel.ForeColor = theme.Blue;
        highlightsDescLabel.ForeColor = theme.Muted;
        highlightsStatusLabel.ForeColor = highlightsProEnabled ? theme.Warn : theme.Muted;
        clipsFolderTitleLabel.ForeColor = theme.Blue;
        clipsFolderValueLabel.ForeColor = theme.Muted;
        premiumCheckoutHintLabel.ForeColor = theme.Muted;
        premiumAccessStatusLabel.ForeColor = premiumAccessActive ? theme.Success : theme.Muted;
        importsLabel.ForeColor = theme.Blue;
        journalLabel.ForeColor = theme.Blue;
        RefreshTrainingUi();

        StylePrimaryButton(connectButton, theme);
        StylePrimaryButton(welcomeConnectButton, theme);
        StyleSecondaryButton(welcomeSiteButton, theme);
        StylePrimaryButton(startButton, theme);
        StyleSecondaryButton(stopButton, theme);
        StylePrimaryButton(clipsFolderButton, theme);
        StyleSecondaryButton(clipsOpenFolderButton, theme);
        StylePrimaryButton(premiumCheckoutButton, theme);
        StyleSecondaryButton(premiumRefreshButton, theme);
        StyleSecondaryButton(themeButton, theme);
        StyleComboBox(languageBox, theme);
        StyleCheckBox(highlightsToggle, theme);
        StylePageButtons(theme);
        RefreshTrainingUi();
        RefreshProfileUi();
    }

    private void ApplyThemeToControls(Control.ControlCollection controls, WzTheme theme)
    {
        foreach (Control control in controls)
        {
            if (control is Label)
            {
                control.BackColor = Color.Transparent;
                control.ForeColor = theme.Ink;
            }
            else if (control is TextBox || control is ListBox || control is NumericUpDown)
            {
                control.BackColor = theme.Surface;
                control.ForeColor = theme.Ink;
            }
            else if (control is Button)
            {
                control.BackColor = theme.SurfaceAlt;
                control.ForeColor = theme.Ink;
            }
            else if (control is CheckBox)
            {
                control.BackColor = Color.Transparent;
                control.ForeColor = theme.Ink;
            }

            if (control.HasChildren) ApplyThemeToControls(control.Controls, theme);
        }
    }

    private void StylePrimaryButton(Button button, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = theme.Blue;
        button.ForeColor = theme.BlueText;
        button.FlatAppearance.BorderColor = theme.Blue;
        button.FlatAppearance.MouseOverBackColor = theme.Blue;
        button.FlatAppearance.MouseDownBackColor = theme.Blue;
    }

    private void StyleSecondaryButton(Button button, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = theme.SurfaceAlt;
        button.ForeColor = theme.Ink;
        button.FlatAppearance.BorderColor = theme.Line;
        button.FlatAppearance.MouseOverBackColor = theme.Surface;
        button.FlatAppearance.MouseDownBackColor = theme.SurfaceAlt;
    }

    private void StylePageButtons(WzTheme theme)
    {
        StylePageButton(freeAccessButton, activePage == "free", theme);
        StylePageButton(premiumButton, activePage == "premium", theme);
        StylePageButton(trainingButton, activePage == "training", theme);
    }

    private void StylePageButton(Button button, bool active, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = active ? theme.Blue : theme.SurfaceAlt;
        button.ForeColor = active ? theme.BlueText : theme.Ink;
        button.FlatAppearance.BorderColor = active ? theme.Blue : theme.Line;
        button.FlatAppearance.MouseOverBackColor = active ? theme.Blue : theme.Surface;
        button.FlatAppearance.MouseDownBackColor = active ? theme.Blue : theme.SurfaceAlt;
    }

    private void StyleComboBox(ComboBox comboBox, WzTheme theme)
    {
        if (comboBox == null) return;
        comboBox.BackColor = theme.SurfaceAlt;
        comboBox.ForeColor = theme.Ink;
    }

    private void StyleCheckBox(CheckBox checkBox, WzTheme theme)
    {
        if (checkBox == null) return;
        checkBox.BackColor = Color.Transparent;
        checkBox.ForeColor = theme.Ink;
        checkBox.FlatAppearance.BorderColor = highlightsProEnabled ? theme.Warn : theme.Line;
        checkBox.FlatAppearance.CheckedBackColor = theme.SurfaceAlt;
        checkBox.FlatAppearance.MouseOverBackColor = theme.SurfaceAlt;
    }

    private void BuildTray()
    {
        var menu = new ContextMenuStrip();
        trayShowItem = new ToolStripMenuItem(T("show"), null, delegate { ShowFromBackground(); });
        trayStartItem = new ToolStripMenuItem(T("start"), null, delegate { StartCompanion(); });
        trayStopItem = new ToolStripMenuItem(T("stop"), null, delegate { StopCompanion(); });
        trayQuitItem = new ToolStripMenuItem(T("quit"), null, delegate { allowExit = true; StopCompanion(); tray.Visible = false; Close(); });
        menu.Items.AddRange(new ToolStripItem[] { trayShowItem, trayStartItem, trayStopItem, trayQuitItem });

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
        tray.Text = T("trayStopped");
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
            if (overlayForm != null && overlayForm.Visible) UpdateOverlay();
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
                    if (captureTimer != null) captureTimer.Dispose();
                    if (overlayForm != null) overlayForm.Dispose();
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
            StopRecorder();
            if (captureTimer != null) captureTimer.Dispose();
            if (endGameTimer != null) endGameTimer.Dispose();
            if (endGameForm != null) endGameForm.Dispose();
            if (overlayForm != null) overlayForm.Dispose();
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
            profilePictureUrl = ExtractLine(text, "profilePicture");
            string savedTheme = ExtractLine(text, "theme");
            if (savedTheme == "light" || savedTheme == "dark") themeMode = savedTheme;
            string savedLanguage = ExtractLine(text, "language");
            if (savedLanguage == "fr" || savedLanguage == "en" || savedLanguage == "es") languageCode = savedLanguage;
            highlightsProEnabled = ExtractLine(text, "highlightsPro") == "1";
            clipsFolderPath = ExtractLine(text, "clipsFolder");
            string savedMode = ExtractLine(text, "clipMode");
            if (savedMode == "raw" || savedMode == "full" || savedMode == "social" || savedMode == "ask") clipMode = savedMode;
            string savedFormat = ExtractLine(text, "socialFormat");
            if (savedFormat == "vertical" || savedFormat == "square" || savedFormat == "horizontal") socialFormat = savedFormat;
            musicPath = ExtractLine(text, "music");
            systemAudioDevice = ExtractLine(text, "sysAudio");
            micAudioDevice = ExtractLine(text, "micAudio");
            string savedTrainingGoal = ExtractLine(text, "trainingGoal");
            if (savedTrainingGoal == "survive" || savedTrainingGoal == "finish" || savedTrainingGoal == "rotate" || savedTrainingGoal == "comms") trainingGoal = savedTrainingGoal;
            string savedTrainingModule = ExtractLine(text, "trainingModule");
            foreach (string key in TrainingModuleKeys())
            {
                if (savedTrainingModule == key)
                {
                    trainingModuleKey = savedTrainingModule;
                    break;
                }
            }
            trainingModuleStates = ExtractLine(text, "trainingModuleStates");
            trainingModuleNotes = ExtractLine(text, "trainingModuleNotes");
            LoadTrainingReviewState(ExtractLine(text, "trainingReview"));
            LoadTrainingZonesState(ExtractLine(text, "trainingZones"));
            if (highlightsToggle != null) highlightsToggle.Checked = highlightsProEnabled;
            RefreshTrainingUi();
            RefreshClipsFolderUi();
        }
        catch
        {
            deviceToken = "";
            connectedName = "";
            profilePictureUrl = "";
        }
    }

    private void SaveSession()
    {
        Directory.CreateDirectory(sessionDir);
        SaveCurrentTrainingModuleState();
        File.WriteAllText(sessionPath, "site=" + site + Environment.NewLine + "token=" + deviceToken + Environment.NewLine + "userName=" + connectedName + Environment.NewLine + "profilePicture=" + profilePictureUrl + Environment.NewLine + "theme=" + themeMode + Environment.NewLine + "language=" + languageCode + Environment.NewLine + "highlightsPro=" + (highlightsProEnabled ? "1" : "0") + Environment.NewLine + "clipsFolder=" + clipsFolderPath + Environment.NewLine + "clipMode=" + clipMode + Environment.NewLine + "socialFormat=" + socialFormat + Environment.NewLine + "music=" + musicPath + Environment.NewLine + "sysAudio=" + systemAudioDevice + Environment.NewLine + "micAudio=" + micAudioDevice + Environment.NewLine + "trainingGoal=" + trainingGoal + Environment.NewLine + "trainingReview=" + TrainingReviewState() + Environment.NewLine + "trainingZones=" + TrainingZonesState() + Environment.NewLine + "trainingModule=" + trainingModuleKey + Environment.NewLine + "trainingModuleStates=" + trainingModuleStates + Environment.NewLine + "trainingModuleNotes=" + trainingModuleNotes, Encoding.UTF8);
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
        try
        {
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            using (HttpResponseMessage response = await http.PostAsync(site + path, content))
            {
                string body = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode) throw new Exception(body);
                return body;
            }
        }
        catch (HttpRequestException ex)
        {
            string detail = ex.InnerException != null ? " Detail: " + ex.InnerException.Message : "";
            throw new Exception(T("joinFailed") + site + T("joinAdvice") + detail, ex);
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

    private static bool JsonBool(string json, string key)
    {
        Match match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
        return match.Success && string.Equals(match.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static void OpenUrl(string url)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }

    private async Task StartLoginFlow()
    {
        if (pollingLogin) return;
        try
        {
            pollingLogin = true;
            connectButton.Enabled = false;
            if (welcomeConnectButton != null) welcomeConnectButton.Enabled = false;
            connectionLabel.Text = T("connecting");
            connectionLabel.ForeColor = Theme.Info;
            if (welcomeLoginStatusLabel != null) welcomeLoginStatusLabel.Text = T("connecting");
            string deviceName = Environment.MachineName;
            string response = await ApiPost("/api/companion/device/start", "{\"deviceName\":\"" + JsonEscape(deviceName) + "\"}");
            deviceCode = JsonString(response, "code");
            deviceId = JsonString(response, "deviceId");
            string connectUrl = JsonString(response, "connectUrl");
            AddLogLine(T("openBrowserCode") + deviceCode);
            OpenUrl(connectUrl);
            loginPollTimer.Start();
        }
        catch (Exception ex)
        {
            pollingLogin = false;
            connectButton.Enabled = true;
            if (welcomeConnectButton != null) welcomeConnectButton.Enabled = true;
            connectionLabel.Text = T("loginImpossible");
            connectionLabel.ForeColor = Theme.Warn;
            if (welcomeLoginStatusLabel != null) welcomeLoginStatusLabel.Text = T("loginImpossible");
            AddLogLine(T("loginFailed") + ex.Message);
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
                profilePictureUrl = JsonString(response, "profilePicture");
                SaveSession();
                RefreshConnectionUi();
                RefreshProfileUi();
                ShowAppShell();
                AddLogLine(T("connectedAs") + connectedName);
                backgroundHome = FetchHomeData();
            }
            else if (status == "expired")
            {
                loginPollTimer.Stop();
                pollingLogin = false;
                deviceCode = "";
                deviceId = "";
                RefreshConnectionUi();
                if (welcomeConnectButton != null) welcomeConnectButton.Enabled = true;
                if (welcomeLoginStatusLabel != null) welcomeLoginStatusLabel.Text = T("expired");
                AddLogLine(T("expired"));
            }
        }
        catch (Exception ex)
        {
            AddLogLine(T("waitingAuth") + ex.Message);
        }
    }

    private void RefreshConnectionUi()
    {
        var theme = Theme;
        if (!string.IsNullOrWhiteSpace(deviceToken))
        {
            connectionLabel.Text = (languageCode == "en" ? "Connected: " : languageCode == "es" ? "Conectado: " : "Connecte : ") + (string.IsNullOrWhiteSpace(connectedName) ? "WZPRO" : connectedName);
            connectionLabel.ForeColor = theme.Success;
            connectButton.Text = T("reconnect");
            if (welcomeConnectButton != null) welcomeConnectButton.Text = T("welcomeConnect");
            if (welcomeConnectButton != null) welcomeConnectButton.Enabled = !pollingLogin;
            startButton.Enabled = true;
        }
        else
        {
            connectionLabel.Text = T("disconnected");
            connectionLabel.ForeColor = theme.Warn;
            connectButton.Text = T("connect");
            if (welcomeConnectButton != null) welcomeConnectButton.Text = T("welcomeConnect");
            if (welcomeConnectButton != null) welcomeConnectButton.Enabled = !pollingLogin;
            startButton.Enabled = false;
        }
        RefreshProfileUi();
    }

    private void StartCompanion()
    {
        if (companionProcess != null && !companionProcess.HasExited) return;
        if (string.IsNullOrWhiteSpace(deviceToken))
        {
            MessageBox.Show(T("connectFirst"), "WZPRO Companion");
            return;
        }

        int pollMs = Math.Max(3000, (int)pollBox.Value * 1000);
        if (!File.Exists(engineScript))
        {
            MessageBox.Show(T("engineMissing"), "WZPRO Companion");
            return;
        }

        statusLabel.Text = T("starting");
        statusLabel.ForeColor = Theme.Info;
        AddLogLine(T("startingFor") + site);
        if (highlightsProEnabled)
        {
            if (!premiumAccessActive && DateTime.UtcNow.Subtract(lastPremiumCheckUtc).TotalSeconds > 45)
            {
                CheckPremiumAccess(false).GetAwaiter().GetResult();
            }
            if (!premiumAccessActive)
            {
                // Block the premium feature for accounts that have not paid.
                highlightsProEnabled = false;
                if (highlightsToggle != null) highlightsToggle.Checked = false;
                AddLogLine(T("premiumRequired"));
                SaveSession();
            }
            else
            {
                try
                {
                    Directory.CreateDirectory(EffectiveClipsFolder());
                    AddLogLine(T("highlightsQueued") + EffectiveClipsFolder());
                    AddLogLine(T("clipsFolderReady") + EffectiveClipsFolder());
                }
                catch (Exception ex)
                {
                    AddLogLine(T("clipsFolderError") + ex.Message);
                }
            }
        }

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
        companionProcess.Exited += delegate
        {
            int exitCode = -1;
            try { exitCode = companionProcess.ExitCode; } catch { }
            pendingLines.Enqueue(T("engineExited") + exitCode);
        };
        companionProcess.Start();
        try
        {
            // Keep the engine off the game's CPU budget.
            companionProcess.PriorityClass = ProcessPriorityClass.BelowNormal;
        }
        catch
        {
            // Priority is best-effort; ignore if the OS denies it.
        }
        companionProcess.BeginOutputReadLine();
        companionProcess.BeginErrorReadLine();
        sessionStartUtc = DateTime.UtcNow;
        sessionGameCount = 0;
        sessionHighlightCount = 0;
        sessionClips.Clear();
        if (captureTimer == null)
        {
            captureTimer = new Timer();
            captureTimer.Tick += delegate { NativeCaptureTick(); };
        }
        captureTimer.Interval = Math.Max(3000, (int)pollBox.Value * 1000);
        captureTimer.Start();
        SetRunningState(true);
        backgroundHome = FetchHomeData();
    }

    private void StopCompanion()
    {
        if (companionProcess != null && !companionProcess.HasExited)
        {
            AddLogLine(T("stopping"));
            try
            {
                companionProcess.Kill();
                companionProcess.WaitForExit(2500);
            }
            catch (Exception ex)
            {
                AddLogLine(T("stopFailed") + ex.Message);
            }
        }
        if (captureTimer != null) captureTimer.Stop();
        if (endGameTimer != null) endGameTimer.Stop();
        HideEndGameChoice();
        StopRecorder();
        if (clipMode == "social" && sessionClips.Count > 0)
        {
            var clipsCopy = new System.Collections.Generic.List<string>(sessionClips);
            string fmt = socialFormat;
            System.Threading.Tasks.Task.Run(delegate { BuildMontage(clipsCopy, fmt); });
        }
        sessionClips.Clear();
        if (sessionStartUtc != default(DateTime))
        {
            int minutes = Math.Max(0, (int)Math.Round(DateTime.UtcNow.Subtract(sessionStartUtc).TotalMinutes));
            AddLogLine(T("sessionSummary") + sessionGameCount + T("sessionGamesSuffix") + minutes + " min");
            sessionStartUtc = default(DateTime);
        }
        SetRunningState(false);
    }

    private void SetRunningState(bool running)
    {
        var theme = Theme;
        startButton.Enabled = !running && !string.IsNullOrWhiteSpace(deviceToken);
        stopButton.Enabled = running;
        pollBox.Enabled = !running;
        connectButton.Enabled = !running && !pollingLogin;
        if (!running)
        {
            statusLabel.Text = T("stopped");
            statusLabel.ForeColor = theme.Muted;
            tray.Text = T("trayStopped");
        }
    }

    private void AddLogLine(string line)
    {
        var theme = Theme;
        if (string.IsNullOrWhiteSpace(line) || logBox == null) return;
        if (line.StartsWith("HIGHLIGHT "))
        {
            HandleHighlight(line.Substring("HIGHLIGHT ".Length));
            return;
        }
        logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + line + Environment.NewLine);
        if (line.Contains("Uploaded game"))
        {
            historyCount++;
            sessionGameCount++;
            historyList.Items.Insert(0, T("gamePrefix") + historyCount + " - " + line);
            RefreshTrainingUi();
            if (premiumAccessActive && highlightsProEnabled && recorderActive)
            {
                if (clipMode == "full") ExportFullGame(line);
                else if (clipMode == "ask") ShowEndGameChoice(line);
            }
        }
        if (line.Contains("Waiting for Call of Duty"))
        {
            statusLabel.Text = T("warzoneMissing");
            statusLabel.ForeColor = theme.Muted;
            tray.Text = T("trayWaitingWarzone");
        }
        else if (line.Contains("waiting for the game window"))
        {
            statusLabel.Text = T("warzoneFocus");
            statusLabel.ForeColor = theme.Warn;
            tray.Text = T("trayWaitingFocus");
        }
        else if (line.Contains("Watching active game window"))
        {
            statusLabel.Text = T("watching");
            statusLabel.ForeColor = theme.Info;
            tray.Text = T("trayWatching");
        }
        else if (line.Contains("Uploaded game"))
        {
            statusLabel.Text = T("gameImported");
            statusLabel.ForeColor = theme.Success;
            tray.ShowBalloonTip(3500, "WZPRO Companion", line, ToolTipIcon.Info);
        }
        else if (line.Contains("Companion waiting"))
        {
            statusLabel.Text = T("waiting");
            statusLabel.ForeColor = theme.Warn;
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
            tray.ShowBalloonTip(3000, T("minimizeTitle"), T("minimizeNotice"), ToolTipIcon.Info);
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
        var theme = Theme;
        using (var dialog = new Form())
        {
            dialog.Text = T("minimizeTitle");
            dialog.Size = new Size(460, 190);
            dialog.StartPosition = FormStartPosition.CenterParent;
            dialog.FormBorderStyle = FormBorderStyle.FixedDialog;
            dialog.MaximizeBox = false;
            dialog.MinimizeBox = false;
            dialog.BackColor = theme.Canvas;
            dialog.ForeColor = theme.Ink;
            dialog.Font = new Font("Consolas", 9);
            var message = Label(T("minimizeNotice"), 22, 24, 400, 42, 9, FontStyle.Bold, theme.Ink);
            var body = Label(T("minimizeBody"), 22, 64, 400, 38, 9, FontStyle.Regular, theme.Muted);
            dialog.Controls.Add(message);
            dialog.Controls.Add(body);
            var reduce = Button(T("reduce"), 156, 112, 116, 30, theme.Blue);
            StylePrimaryButton(reduce, theme);
            reduce.DialogResult = DialogResult.Cancel;
            dialog.Controls.Add(reduce);
            var quit = Button(T("quitDialog"), 282, 112, 140, 30, theme.SurfaceAlt);
            StyleSecondaryButton(quit, theme);
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
