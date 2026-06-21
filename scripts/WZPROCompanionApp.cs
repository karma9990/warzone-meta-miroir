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
        "cod",
        "cod22-cod",
        "cod23-cod",
        "cod24-cod",
        "cod_launcher",
        "modernwarfare",
        "modernwarfareii",
        "modernwarfareiii",
        "blackops6",
        "bo6",
        "s1_mp64_ship"
    };
    private static readonly string NativeScreenshotPath = Path.Combine(Path.GetTempPath(), "wzpro-companion-warzone-window.png");

    // Rolling-buffer clip recorder (ffmpeg). Records the focused game window into a
    // circular set of short segments; a highlight saves the recent segments as a clip.
    private string ffmpegPath = "";
    private Process recorderProcess;
    private bool recorderActive;
    private bool recorderStopping;
    private string lastRecorderError = "";
    private ComboBox clipModeCombo;
    private ComboBox clipDurationCombo;
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
    private int highlightClipSeconds = 15;    // NVIDIA-like instant replay length: 30 | 15 | 10 | 5
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
    private const int OverlayHotkeyId = 0xB002;
    private const int ActionOverlayHotkeyId = 0xB003;
    private static readonly ReplayHotkey[] OverlayHotkeyCandidates = new ReplayHotkey[]
    {
        new ReplayHotkey(ModControl | ModAlt, 0x4F, "Ctrl+Alt+O"),
        new ReplayHotkey(ModControl | ModShift, 0x4F, "Ctrl+Shift+O"),
        new ReplayHotkey(ModControl | ModAlt, 0x77, "Ctrl+Alt+F8"),
    };
    private string activeOverlayHotkeyLabel = "";
    private static readonly ReplayHotkey[] ActionOverlayHotkeyCandidates = new ReplayHotkey[]
    {
        new ReplayHotkey(ModControl | ModAlt, 0x41, "Ctrl+Alt+A"),
        new ReplayHotkey(ModControl | ModShift, 0x41, "Ctrl+Shift+A"),
        new ReplayHotkey(ModControl | ModAlt, 0x79, "Ctrl+Alt+F10"),
    };
    private string activeActionOverlayHotkeyLabel = "";
    private bool overlayHotkeyRegistered;
    private bool actionOverlayHotkeyRegistered;
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
    private Panel settingsInfoCard;
    private Panel settingsProfileCard;
    private Label settingsPageTitleLabel;
    private Label settingsPageDescLabel;
    private Label settingsActivisionLabel;
    private TextBox settingsActivisionBox;
    private Label settingsPictureLabel;
    private PictureBox settingsPicturePreviewBox;
    private TextBox settingsPictureUrlBox;
    private Button settingsChoosePictureButton;
    private Button settingsSaveButton;
    private Label settingsStatusLabel;
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
    private int perfCpu = -1, perfRam = -1, perfGpu = -1;
    private bool gpuCounterUnavailable;
    private DateTime lastGpuSampleUtc;
    private Button statsButton;
    private Button gameBarButton;
    private TextBox statsBox;
    private Button overlayButton;
    private Form overlayForm;
    private Label overlayLabel;
    private Form actionOverlayForm;
    private Label actionOverlayTitleLabel;
    private Button actionStartStopButton;
    private Button actionBoostButton;
    private Button actionReplayButton;
    private Button actionSaveHighlightsButton;
    private Button actionCoachButton;
    private Button actionClipsButton;
    private Button overlayOptionsButton;
    private CheckBox overlayOptGamesCheck;
    private CheckBox overlayOptHighlightsCheck;
    private CheckBox overlayOptMetaCheck;
    private CheckBox overlayOptPerfCheck;
    private string metaTodayWeapon = "";
    private Panel topBarPanel;
    private Label searchBoxLabel;
    private Button minimizeButton;
    private Button closeButton;
    private PictureBox brandLogoBox;
    private Point windowDragStart;
    private bool windowDragging;
    private Point overlayDragStart;
    private bool overlayDragging;
    private int overlayX = 24, overlayY = 24; // persisted overlay position
    private bool overlayOptionsVisible;
    private bool overlayShowGames = true, overlayShowHighlights = true, overlayShowMeta = true, overlayShowPerf = true;
    private CheckBox overlayGamesCheck, overlayHighlightsCheck, overlayMetaCheck, overlayPerfCheck;
    private bool applyingOverlayState; // suppresses checkbox events while syncing UI from saved state
    private Panel sidebarPanel;
    private Panel mainPanel;
    private Panel welcomePanel;
    private Panel welcomeLoginPanel;
    private Panel freeInfoCard;
    private Panel freeConnectionCard;
    private Panel freeControlsCard;
    private Panel freeStatsCard;
    private Label freeStatsTitleLabel;
    private Label freeStatsSummaryLabel;
    private Label freeStatsDetailLabel;
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
    private Panel trainingQuizCard;
    private Panel trainingRoutineCard;
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
    private Button optimisationButton;
    private Label premiumSidebarLabel;
    private Label recorderSidebarLabel;
    private Label overlayHotkeySidebarLabel;
    private Label actionOverlayHotkeySidebarLabel;
    private Label updateStatusLabel;
    private Button restartButton;
    private Button compactButton;
    private Button supportButton;
    private Panel optimisationInfoCard;
    private Panel optimisationOverlayCard;
    private Label optimisationPageTitleLabel;
    private Label optimisationPageDescLabel;
    private Label optimisationOverlayTitleLabel;
    private Label optimisationOverlayDescLabel;
    private Label optimisationOverlayStatusLabel;
    private Button overlayToggleButton;
    private Panel optimisationBoostCard;
    private Label optimisationBoostTitleLabel;
    private Label optimisationBoostDescLabel;
    private Label optimisationBoostStatusLabel;
    private Button gameBoostButton;
    private bool gameBoostActive;
    private string savedPowerScheme = "";
    private const string HighPerfSchemeGuid = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
    // Game Boost sub-options (all reversible when the boost is turned off / app closes).
    private bool boostFreeRam = true, boostPriority = true, boostVisualEffects = true;
    private CheckBox boostFreeRamCheck, boostPriorityCheck, boostVisualCheck;
    private bool savedUiEffects = true; // Windows UI-effects state captured before the boost
    private bool uiEffectsOverridden;
    private readonly System.Collections.Generic.Dictionary<int, ProcessPriorityClass> savedGamePriorities = new System.Collections.Generic.Dictionary<int, ProcessPriorityClass>();
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
    private Button trainingQuizAnalyzeButton;
    private Button trainingRoutineButton;
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
    private ComboBox trainingQuizStyleCombo;
    private ComboBox trainingQuizInputCombo;
    private ComboBox trainingQuizTeamCombo;
    private ComboBox trainingQuizWeaknessCombo;
    private ComboBox trainingQuizPaceCombo;
    private ComboBox trainingRoutineDurationCombo;
    private ComboBox trainingRoutineFocusCombo;
    private Label trainingCoachResultLabel;
    private TextBox trainingRoutineResultBox;
    private TextBox logBox;
    private ToolStripMenuItem trayShowItem;
    private ToolStripMenuItem trayStartItem;
    private ToolStripMenuItem trayStopItem;
    private ToolStripMenuItem trayQuitItem;
    private ContextMenuStrip profileMenu;
    private ToolStripMenuItem profileRestartItem;
    private ToolStripMenuItem profileCompactItem;
    private ToolStripMenuItem profileSupportItem;
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
    private string trainingCoachResult = "";
    private string trainingRoutineResult = "";
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
    private Task backgroundStats;
    private Task backgroundUpdateCheck;
    private bool updateAvailable;
    private string updateUrl = "";
    private bool compactMode;
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
        ApplyResponsiveLayout();
        AddLogLine(T("ready"));
        AddLogLine(T("site") + site);
        if (!string.IsNullOrWhiteSpace(deviceToken))
        {
            backgroundHome = FetchHomeData();
            backgroundStats = FetchStats();
        }
        backgroundUpdateCheck = CheckForUpdates(false);
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
        Size = new Size(1040, 784);
        MinimumSize = new Size(1040, 784);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        DoubleBuffered = true;
        Font = AppFont(9, FontStyle.Regular);

        welcomePanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(1040, 784),
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

        topBarPanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(760, 72),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            Cursor = Cursors.SizeAll
        };
        topBarPanel.MouseDown += StartWindowDrag;
        topBarPanel.MouseMove += DragWindow;
        topBarPanel.MouseUp += EndWindowDrag;
        mainPanel.Controls.Add(topBarPanel);

        brandLogoBox = new PictureBox
        {
            Location = new Point(22, 16),
            Size = new Size(176, 46),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent
        };
        sidebarPanel.Controls.Add(brandLogoBox);

        titleLabel = Label("WZPRO", 22, 20, 176, 36, 20, FontStyle.Bold, Color.White);
        titleLabel.Visible = false;
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

        optimisationButton = Button("", 16, 254, 188, 44, Color.FromArgb(42, 42, 48));
        optimisationButton.Click += delegate { ShowPage("optimisation"); };
        sidebarPanel.Controls.Add(optimisationButton);

        premiumSidebarLabel = Label("", 16, 312, 188, 22, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        premiumSidebarLabel.TextAlign = ContentAlignment.MiddleCenter;
        sidebarPanel.Controls.Add(premiumSidebarLabel);

        recorderSidebarLabel = Label("", 16, 338, 188, 22, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        recorderSidebarLabel.TextAlign = ContentAlignment.MiddleCenter;
        sidebarPanel.Controls.Add(recorderSidebarLabel);

        overlayHotkeySidebarLabel = Label("", 16, 364, 188, 22, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        overlayHotkeySidebarLabel.TextAlign = ContentAlignment.MiddleCenter;
        sidebarPanel.Controls.Add(overlayHotkeySidebarLabel);

        actionOverlayHotkeySidebarLabel = Label("", 16, 390, 188, 22, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        actionOverlayHotkeySidebarLabel.TextAlign = ContentAlignment.MiddleCenter;
        sidebarPanel.Controls.Add(actionOverlayHotkeySidebarLabel);

        updateStatusLabel = Label("", 16, 416, 188, 34, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        updateStatusLabel.TextAlign = ContentAlignment.MiddleCenter;
        sidebarPanel.Controls.Add(updateStatusLabel);

        restartButton = Button("", 16, 458, 188, 30, Color.FromArgb(42, 42, 48));
        restartButton.Click += delegate { RestartApp(); };
        restartButton.Visible = false;

        compactButton = Button("", 16, 446, 188, 30, Color.FromArgb(42, 42, 48));
        compactButton.Click += delegate { ToggleCompactMode(); };
        compactButton.Visible = false;

        supportButton = Button("", 16, 484, 188, 30, Color.FromArgb(42, 42, 48));
        supportButton.Click += delegate { ContactSupport(); };
        supportButton.Visible = false;

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
        profileNameLabel.Visible = false;
        profileNameLabel.Click += delegate { ShowProfileMenu(); };
        profilePanel.Controls.Add(profileNameLabel);

        profileMenu = new ContextMenuStrip();
        profileRestartItem = new ToolStripMenuItem("", null, delegate { RestartApp(); });
        profileCompactItem = new ToolStripMenuItem("", null, delegate { ToggleCompactMode(); });
        profileSupportItem = new ToolStripMenuItem("", null, delegate { ContactSupport(); });
        profileSettingsItem = new ToolStripMenuItem("", null, delegate { OpenProfileSettings(); });
        profileLogoutItem = new ToolStripMenuItem("", null, delegate { LogoutProfile(); });
        profileMenu.Items.Add(profileRestartItem);
        profileMenu.Items.Add(profileCompactItem);
        profileMenu.Items.Add(profileSupportItem);
        profileMenu.Items.Add(new ToolStripSeparator());
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
        topBarPanel.Controls.Add(languageBox);

        themeButton = Button("MODE CLAIR", 608, 24, 116, 28, Color.FromArgb(22, 60, 255));
        themeButton.Click += delegate { ToggleTheme(); };
        topBarPanel.Controls.Add(themeButton);

        overlayButton = Button("", 466, 24, 132, 28, Color.FromArgb(42, 42, 48));
        overlayButton.Click += delegate { ToggleOverlay(); };
        topBarPanel.Controls.Add(overlayButton);

        gameBarButton = Button("", 300, 24, 158, 28, Color.FromArgb(22, 60, 255));
        gameBarButton.Click += delegate { OpenUrl("ms-settings:gaming-gamebar"); };
        topBarPanel.Controls.Add(gameBarButton);

        searchBoxLabel = Label("Search", 462, 16, 220, 34, 9, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        searchBoxLabel.TextAlign = ContentAlignment.MiddleLeft;
        searchBoxLabel.Padding = new Padding(14, 0, 0, 0);
        topBarPanel.Controls.Add(searchBoxLabel);

        minimizeButton = Button("_", 690, 16, 34, 34, Color.FromArgb(22, 22, 24));
        minimizeButton.Click += delegate { WindowState = FormWindowState.Minimized; };
        topBarPanel.Controls.Add(minimizeButton);

        closeButton = Button("X", 728, 16, 34, 34, Color.FromArgb(22, 22, 24));
        closeButton.Click += delegate { Close(); };
        topBarPanel.Controls.Add(closeButton);

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
        metaTodayLabel.Visible = false;
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

        freeStatsCard = new Panel
        {
            Location = new Point(34, 496),
            Size = new Size(690, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(freeStatsCard);

        freeStatsTitleLabel = Label("", 24, 16, 220, 22, 10, FontStyle.Bold, Color.White);
        freeStatsCard.Controls.Add(freeStatsTitleLabel);

        freeStatsSummaryLabel = Label("", 24, 46, 300, 24, 14, FontStyle.Bold, Color.White);
        freeStatsCard.Controls.Add(freeStatsSummaryLabel);

        freeStatsDetailLabel = Label("", 340, 24, 320, 44, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        freeStatsCard.Controls.Add(freeStatsDetailLabel);

        settingsInfoCard = new Panel
        {
            Location = new Point(34, 92),
            Size = new Size(690, 112),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle,
            Visible = false
        };
        mainPanel.Controls.Add(settingsInfoCard);

        settingsPageTitleLabel = Label("", 24, 22, 420, 32, 16, FontStyle.Bold, Color.White);
        settingsInfoCard.Controls.Add(settingsPageTitleLabel);

        settingsPageDescLabel = Label("", 24, 62, 620, 40, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        settingsInfoCard.Controls.Add(settingsPageDescLabel);

        settingsProfileCard = new Panel
        {
            Location = new Point(34, 224),
            Size = new Size(690, 244),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle,
            Visible = false
        };
        mainPanel.Controls.Add(settingsProfileCard);

        settingsActivisionLabel = Label("", 24, 24, 220, 22, 9, FontStyle.Bold, Color.White);
        settingsProfileCard.Controls.Add(settingsActivisionLabel);

        settingsActivisionBox = new TextBox
        {
            Location = new Point(24, 52),
            Size = new Size(300, 24),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        settingsProfileCard.Controls.Add(settingsActivisionBox);

        settingsPictureLabel = Label("", 24, 94, 250, 22, 9, FontStyle.Bold, Color.White);
        settingsProfileCard.Controls.Add(settingsPictureLabel);

        settingsPicturePreviewBox = new PictureBox
        {
            Location = new Point(24, 124),
            Size = new Size(58, 58),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent
        };
        settingsProfileCard.Controls.Add(settingsPicturePreviewBox);

        settingsPictureUrlBox = new TextBox
        {
            Location = new Point(96, 128),
            Size = new Size(340, 24),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        settingsProfileCard.Controls.Add(settingsPictureUrlBox);

        settingsChoosePictureButton = Button("", 450, 126, 108, 28, Color.FromArgb(42, 42, 48));
        settingsChoosePictureButton.Click += delegate { ChooseSettingsPicture(); };
        settingsProfileCard.Controls.Add(settingsChoosePictureButton);

        settingsSaveButton = Button("", 574, 126, 92, 28, Color.FromArgb(22, 60, 255));
        settingsSaveButton.Click += async delegate { await SaveProfileSettings(); };
        settingsProfileCard.Controls.Add(settingsSaveButton);

        settingsStatusLabel = Label("", 96, 164, 570, 48, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        settingsProfileCard.Controls.Add(settingsStatusLabel);

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
            Size = new Size(690, 124),
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
            Location = new Point(12, 42),
            Size = new Size(210, 24),
            DropDownStyle = ComboBoxStyle.DropDownList,
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold)
        };
        clipModeCombo.SelectedIndexChanged += delegate { OnClipModeChanged(); };
        premiumAdvancedCard.Controls.Add(clipModeCombo);

        clipDurationCombo = new ComboBox
        {
            Location = new Point(12, 68),
            Size = new Size(210, 24),
            DropDownStyle = ComboBoxStyle.DropDownList,
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold)
        };
        clipDurationCombo.SelectedIndexChanged += delegate { OnClipDurationChanged(); };
        premiumAdvancedCard.Controls.Add(clipDurationCombo);

        socialFormatCombo = new ComboBox
        {
            Location = new Point(12, 94),
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
            Location = new Point(24, 124),
            Size = new Size(220, 300),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
            BorderStyle = BorderStyle.None
        };
        trainingGoalCard.Controls.Add(trainingCategoryCard);

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
            Location = new Point(258, 124),
            Size = new Size(456, 300),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.None
        };
        trainingGoalCard.Controls.Add(trainingModuleCard);

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

        trainingQuizCard = new Panel
        {
            Location = new Point(34, 516),
            Size = new Size(330, 180),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingQuizCard);

        var trainingQuizTitleLabel = Label("", 18, 14, 240, 22, 10, FontStyle.Bold, Color.White);
        trainingQuizTitleLabel.Name = "trainingQuizTitleLabel";
        trainingQuizCard.Controls.Add(trainingQuizTitleLabel);

        trainingQuizStyleCombo = TrainingCombo(18, 44, 140);
        trainingQuizStyleCombo.Items.AddRange(new object[] { "Agressif", "Flex", "Support", "Sniper" });
        trainingQuizStyleCombo.SelectedIndex = 1;
        trainingQuizCard.Controls.Add(trainingQuizStyleCombo);

        trainingQuizInputCombo = TrainingCombo(170, 44, 140);
        trainingQuizInputCombo.Items.AddRange(new object[] { "Manette", "Clavier/souris" });
        trainingQuizInputCombo.SelectedIndex = 0;
        trainingQuizCard.Controls.Add(trainingQuizInputCombo);

        trainingQuizTeamCombo = TrainingCombo(18, 78, 140);
        trainingQuizTeamCombo.Items.AddRange(new object[] { "Solo", "Duo", "Trio", "Squad" });
        trainingQuizTeamCombo.SelectedIndex = 2;
        trainingQuizCard.Controls.Add(trainingQuizTeamCombo);

        trainingQuizWeaknessCombo = TrainingCombo(170, 78, 140);
        trainingQuizWeaknessCombo.Items.AddRange(new object[] { "Regain", "Rotations", "Fights", "Endgame", "Mental" });
        trainingQuizWeaknessCombo.SelectedIndex = 0;
        trainingQuizCard.Controls.Add(trainingQuizWeaknessCombo);

        trainingQuizPaceCombo = TrainingCombo(18, 112, 140);
        trainingQuizPaceCombo.Items.AddRange(new object[] { "Lent", "Controle", "Rapide" });
        trainingQuizPaceCombo.SelectedIndex = 1;
        trainingQuizCard.Controls.Add(trainingQuizPaceCombo);

        trainingQuizAnalyzeButton = Button("", 170, 110, 140, 30, Color.FromArgb(22, 60, 255));
        trainingQuizAnalyzeButton.Click += async delegate { await RunTrainingCoach("profile"); };
        trainingQuizCard.Controls.Add(trainingQuizAnalyzeButton);

        trainingCoachResultLabel = Label("", 18, 146, 292, 28, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        trainingCoachResultLabel.Name = "trainingCoachResultLabel";
        trainingQuizCard.Controls.Add(trainingCoachResultLabel);

        trainingRoutineCard = new Panel
        {
            Location = new Point(388, 516),
            Size = new Size(336, 180),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(trainingRoutineCard);

        var trainingRoutineTitleLabel = Label("", 18, 14, 240, 22, 10, FontStyle.Bold, Color.White);
        trainingRoutineTitleLabel.Name = "trainingRoutineTitleLabel";
        trainingRoutineCard.Controls.Add(trainingRoutineTitleLabel);

        trainingRoutineDurationCombo = TrainingCombo(18, 44, 112);
        trainingRoutineDurationCombo.Items.AddRange(new object[] { "15 min", "30 min", "45 min", "60 min" });
        trainingRoutineDurationCombo.SelectedIndex = 1;
        trainingRoutineCard.Controls.Add(trainingRoutineDurationCombo);

        trainingRoutineFocusCombo = TrainingCombo(142, 44, 132);
        trainingRoutineFocusCombo.Items.AddRange(new object[] { "Aim", "Regain", "Rotations", "Endgame", "Ranked" });
        trainingRoutineFocusCombo.SelectedIndex = 1;
        trainingRoutineCard.Controls.Add(trainingRoutineFocusCombo);

        trainingRoutineButton = Button("", 286, 42, 120, 30, Color.FromArgb(22, 60, 255));
        trainingRoutineButton.Click += async delegate { await RunTrainingCoach("routine"); };
        trainingRoutineCard.Controls.Add(trainingRoutineButton);

        trainingRoutineResultBox = new TextBox
        {
            Location = new Point(18, 84),
            Size = new Size(300, 78),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            ReadOnly = true,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.FromArgb(220, 220, 225),
            BorderStyle = BorderStyle.FixedSingle,
            Font = AppFont(8, FontStyle.Regular)
        };
        trainingRoutineCard.Controls.Add(trainingRoutineResultBox);

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

        // ── Optimisation page ──
        optimisationInfoCard = new Panel
        {
            Location = new Point(34, 26),
            Size = new Size(690, 84),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationInfoCard);
        optimisationPageTitleLabel = Label("", 24, 16, 440, 30, 16, FontStyle.Bold, Color.White);
        optimisationInfoCard.Controls.Add(optimisationPageTitleLabel);
        optimisationPageDescLabel = Label("", 24, 50, 640, 24, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        optimisationInfoCard.Controls.Add(optimisationPageDescLabel);

        optimisationOverlayCard = new Panel
        {
            Location = new Point(34, 122),
            Size = new Size(690, 120),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationOverlayCard);
        optimisationOverlayTitleLabel = Label("", 24, 16, 440, 24, 11, FontStyle.Bold, Color.White);
        optimisationOverlayCard.Controls.Add(optimisationOverlayTitleLabel);
        optimisationOverlayDescLabel = Label("", 24, 44, 480, 32, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        optimisationOverlayCard.Controls.Add(optimisationOverlayDescLabel);
        overlayToggleButton = Button("", 520, 46, 150, 40, Color.FromArgb(22, 60, 255));
        overlayToggleButton.Click += delegate { ToggleOverlay(); };
        optimisationOverlayCard.Controls.Add(overlayToggleButton);
        overlayGamesCheck = OverlayLineCheck(24, 82);
        overlayGamesCheck.CheckedChanged += delegate { if (applyingOverlayState) return; overlayShowGames = overlayGamesCheck.Checked; OnOverlayLineToggle(); };
        overlayHighlightsCheck = OverlayLineCheck(150, 82);
        overlayHighlightsCheck.CheckedChanged += delegate { if (applyingOverlayState) return; overlayShowHighlights = overlayHighlightsCheck.Checked; OnOverlayLineToggle(); };
        overlayMetaCheck = OverlayLineCheck(300, 82);
        overlayMetaCheck.CheckedChanged += delegate { if (applyingOverlayState) return; overlayShowMeta = overlayMetaCheck.Checked; OnOverlayLineToggle(); };
        overlayPerfCheck = OverlayLineCheck(420, 82);
        overlayPerfCheck.CheckedChanged += delegate
        {
            if (applyingOverlayState) return;
            overlayShowPerf = overlayPerfCheck.Checked;
            if (!overlayShowPerf) { lastIdleTime = lastKernelTime = lastUserTime = 0; perfCpu = -1; perfGpu = -1; } // reset CPU/GPU baseline so re-enabling doesn't spike
            OnOverlayLineToggle();
        };

        optimisationOverlayStatusLabel = Label("", 24, 110, 480, 20, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        optimisationOverlayCard.Controls.Add(optimisationOverlayStatusLabel);

        optimisationBoostCard = new Panel
        {
            Location = new Point(34, 266),
            Size = new Size(690, 156),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationBoostCard);
        optimisationBoostTitleLabel = Label("", 24, 16, 440, 24, 11, FontStyle.Bold, Color.White);
        optimisationBoostCard.Controls.Add(optimisationBoostTitleLabel);
        optimisationBoostDescLabel = Label("", 24, 46, 480, 48, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        optimisationBoostCard.Controls.Add(optimisationBoostDescLabel);
        gameBoostButton = Button("", 520, 46, 150, 40, Color.FromArgb(22, 60, 255));
        gameBoostButton.Click += delegate { ToggleGameBoost(); };
        optimisationBoostCard.Controls.Add(gameBoostButton);
        boostFreeRamCheck = BoostOptionCheck(24, 92, boostFreeRam);
        boostFreeRamCheck.CheckedChanged += delegate { boostFreeRam = boostFreeRamCheck.Checked; SaveSession(); };
        boostPriorityCheck = BoostOptionCheck(200, 92, boostPriority);
        boostPriorityCheck.CheckedChanged += delegate { boostPriority = boostPriorityCheck.Checked; SaveSession(); };
        boostVisualCheck = BoostOptionCheck(380, 92, boostVisualEffects);
        boostVisualCheck.CheckedChanged += delegate { boostVisualEffects = boostVisualCheck.Checked; SaveSession(); };
        optimisationBoostStatusLabel = Label("", 24, 122, 480, 20, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        optimisationBoostCard.Controls.Add(optimisationBoostStatusLabel);
    }

    private CheckBox BoostOptionCheck(int x, int y, bool initial)
    {
        CheckBox cb = new CheckBox
        {
            Location = new Point(x, y),
            AutoSize = true,
            Checked = initial,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Regular),
            ForeColor = Color.White
        };
        optimisationBoostCard.Controls.Add(cb);
        return cb;
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

    private ComboBox TrainingCombo(int x, int y, int w)
    {
        return new ComboBox
        {
            Location = new Point(x, y),
            Size = new Size(w, 24),
            DropDownStyle = ComboBoxStyle.DropDownList,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Regular)
        };
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
                Canvas = Color.FromArgb(7, 9, 13),
                Surface = Color.FromArgb(17, 20, 27),
                SurfaceAlt = Color.FromArgb(13, 16, 22),
                Ink = Color.FromArgb(243, 246, 239),
                Muted = Color.FromArgb(148, 158, 174),
                Line = Color.FromArgb(36, 45, 61),
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
                case "freePageDesc": return "Connect WZPRO with the same Activision ID shown in Warzone. The screen reader uses that name to pick your scoreboard row.";
                case "settingsPageTitle": return "Profile settings";
                case "settingsPageDesc": return "Set the Activision ID shown in Warzone and choose the profile picture used by Companion.";
                case "settingsActivisionLabel": return "Activision ID / scoreboard name";
                case "settingsPictureLabel": return "Profile picture URL or local image";
                case "settingsChoosePicture": return "CHOOSE";
                case "settingsSave": return "SAVE";
                case "settingsSaved": return "Profile saved. Restart START tracking if it was already running.";
                case "settingsSaving": return "Saving profile...";
                case "settingsFailed": return "Profile save failed: ";
                case "settingsNeedConnect": return "Connect WZPRO before editing your profile.";
                case "settingsImageTooLarge": return "Image must be under 500 KB.";
                case "freeStatsTitle": return "Session stats";
                case "freeStatsEmpty": return "No imported games yet";
                case "freeStatsLoading": return "Loading stats...";
                case "freeStatsGames": return "games";
                case "freeStatsDetail": return "Avg kills {kills}  |  Avg dmg {damage}  |  Win {win}%  |  Top 10 {top}%";
                case "premiumPageTitle": return "Premium access";
                case "premiumPageDesc": return "Optional paid modules for players who want clips, review tools and richer automation inside the same app.";
                case "trainingAccess": return "TRAINING LAB";
                case "optimisationAccess": return "OPTIMISATION";
                case "optimisationPageTitle": return "Optimisation";
                case "optimisationPageDesc": return "Turn on the in-game overlay and keep an eye on your system load while you play.";
                case "optimisationOverlayTitle": return "In-game overlay";
                case "optimisationOverlayDesc": return "Floating box over the game: CPU/RAM and session games for everyone. Highlights and replay hotkey are Premium.";
                case "optimisationOverlayBtn": return "Toggle overlay";
                case "optimisationOverlayOn": return "Overlay: shown";
                case "optimisationOverlayOff": return "Overlay: hidden";
                case "optimisationBoostTitle": return "Game Boost";
                case "optimisationBoostDesc": return "High Performance power plan plus the extras you tick below, while you play. Everything is restored when you close the app.";
                case "optimisationBoostBtnOn": return "Enable Boost";
                case "optimisationBoostBtnOff": return "Disable Boost";
                case "optimisationBoostStatusOn": return "Boost: on (High Performance)";
                case "optimisationBoostStatusOff": return "Boost: off";
                case "optimisationBoostFreeRam": return "Free up RAM";
                case "optimisationBoostPriority": return "Warzone high priority";
                case "optimisationBoostVisual": return "Cut visual effects";
                case "optimisationBoostUnavailable": return "High Performance power plan not available on this PC.";
                case "optimisationBoostOn": return "Game Boost on - High Performance power plan active.";
                case "optimisationBoostOff": return "Game Boost off - power plan restored.";
                case "overlayToggleGames": return "Games";
                case "overlayToggleHighlights": return "Highlights";
                case "overlayToggleMeta": return "Meta";
                case "overlayTogglePerf": return "CPU/RAM/GPU";
                case "overlayToggleActions": return "Buttons";
                case "overlayHotkeyActive": return "Overlay hotkey: ";
                case "actionOverlayHotkeyActive": return "Actions overlay hotkey: ";
                case "premiumSideActive": return "PREMIUM ACTIVE";
                case "premiumSideInactive": return "PREMIUM OFF";
                case "recorderActive": return "RECORDER ACTIVE";
                case "recorderIdle": return "RECORDER READY";
                case "restartApp": return "RESTART APP";
                case "compactMode": return "COMPACT MODE";
                case "compactExit": return "FULL MODE";
                case "supportButton": return "SUPPORT";
                case "updateChecking": return "Checking update...";
                case "updateAvailable": return "Update available: ";
                case "updateCurrent": return "App up to date";
                case "updateUnavailable": return "Update check unavailable";
                case "restartFailed": return "Restart failed: ";
                case "supportCopied": return "Diagnostic copied for support.";
                case "statsSent": return "Stats sent to WZPRO.";
                case "clipSaved": return "Clip saved.";
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
                case "trainingQuizTitle": return "Player profile quiz";
                case "trainingQuizAnalyze": return "ANALYZE";
                case "trainingRoutineTitle": return "Coach routine";
                case "trainingRoutineBuild": return "BUILD";
                case "trainingCoachEmpty": return "Answer the quiz, then ask the coach for a profile analysis.";
                case "trainingRoutineEmpty": return "Choose a duration and focus, then generate today's routine.";
                case "trainingCoachThinking": return "Coach is analyzing...";
                case "trainingCoachError": return "Coach unavailable: ";
                case "profileGuest": return "Not connected";
                case "goSettings": return "Settings";
                case "logout": return "Log out";
                case "welcomeKicker": return "STEP INTO WZPRO";
                case "welcomeTitle": return "WZPRO COMPANION TRACKS YOUR GAME STATS";
                case "welcomeSubtitle": return "";
                case "welcomeStats": return "Live stats import  /  Free access  /  Premium modules ready";
                case "welcomeLoginTitle": return "Connect to continue";
                case "welcomeConnect": return "CONNECT WZPRO";
                case "welcomeSite": return "OPEN SITE";
                case "welcomeStatus": return "Use the same Activision ID as Warzone. The app needs it to read your correct end-game row.";
                case "stopped": return "Stopped";
                case "disconnected": return "Not connected";
                case "connect": return "CONNECT TO WZPRO";
                case "reconnect": return "RECONNECT";
                case "verifyEvery": return "Check every";
                case "seconds": return "seconds";
                case "start": return "START";
                case "stop": return "STOP";
                case "hint": return "Important: your WZPRO account name must match your Activision ID / Warzone scoreboard name for screen imports.";
                case "highlightsTitle": return "Highlights Pro";
                case "highlightsToggle": return "AUTO CLIPS";
                case "highlightsDesc": return "NVIDIA-style replay buffer: auto-saves strong moments and manual replays at 30, 15, 10 or 5 seconds.";
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
                case "overlayShortcutSide": return "OVERLAY ";
                case "overlayShortcutMissing": return "OVERLAY HOTKEY OFF";
                case "actionOverlayShortcutSide": return "ACTIONS ";
                case "actionOverlayShortcutMissing": return "ACTIONS HOTKEY OFF";
                case "overlayGames": return "Games: ";
                case "overlayHighlights": return "Highlights: ";
                case "overlayReplay": return "Replay: ";
                case "overlayActionStart": return "START TRACKING";
                case "overlayActionStop": return "STOP";
                case "overlayActionBoost": return "BOOST INACTIVE";
                case "overlayActionBoostOff": return "BOOST ACTIVE";
                case "overlayActionReplay": return "SAVE REPLAY";
                case "overlayActionSaveHighlights": return "SAVE HIGHLIGHTS";
                case "overlayActionCoach": return "GAME + COACH";
                case "overlayActionClips": return "OPEN CLIPS FOLDER";
                case "overlayActionOptions": return "OPTIONS";
                case "highlightDetected": return "Highlight: ";
                case "highlightWin": return "Victory";
                case "highlightTop3": return "Top 3";
                case "highlightMultikill": return "Multi-kill";
                case "highlightDominant": return "Dominant win";
                case "highlightBigDamage": return "Big damage";
                case "highlightKill": return "Kill";
                case "highlightDeath": return "Death";
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
                case "duration30": return "Clip length: 30 sec";
                case "duration15": return "Clip length: 15 sec";
                case "duration10": return "Clip length: 10 sec";
                case "duration5": return "Clip length: 5 sec";
                case "endGameTitle": return "Game over - save all highlights?";
                case "endGameSocial": return "Save highlights";
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
                case "freePageDesc": return "Conecta WZPRO con el mismo Activision ID que aparece en Warzone. El lector usa ese nombre para elegir tu fila.";
                case "settingsPageTitle": return "Ajustes de perfil";
                case "settingsPageDesc": return "Pon el Activision ID que aparece en Warzone y elige la foto usada por Companion.";
                case "settingsActivisionLabel": return "Activision ID / nombre del marcador";
                case "settingsPictureLabel": return "URL de foto o imagen local";
                case "settingsChoosePicture": return "ELEGIR";
                case "settingsSave": return "GUARDAR";
                case "settingsSaved": return "Perfil guardado. Reinicia START si el tracking ya estaba activo.";
                case "settingsSaving": return "Guardando perfil...";
                case "settingsFailed": return "Error al guardar perfil: ";
                case "settingsNeedConnect": return "Conecta WZPRO antes de editar tu perfil.";
                case "settingsImageTooLarge": return "La imagen debe pesar menos de 500 KB.";
                case "freeStatsTitle": return "Stats de sesion";
                case "freeStatsEmpty": return "Aun no hay partidas importadas";
                case "freeStatsLoading": return "Cargando stats...";
                case "freeStatsGames": return "partidas";
                case "freeStatsDetail": return "Kills prom {kills}  |  Dano prom {damage}  |  Win {win}%  |  Top 10 {top}%";
                case "premiumPageTitle": return "Acceso premium";
                case "premiumPageDesc": return "Modulos de pago opcionales para clips, review y automatizaciones mas completas en la misma app.";
                case "trainingAccess": return "TRAINING LAB";
                case "optimisationAccess": return "OPTIMIZACION";
                case "optimisationPageTitle": return "Optimizacion";
                case "optimisationPageDesc": return "Activa el overlay en partida y vigila la carga del sistema mientras juegas.";
                case "optimisationOverlayTitle": return "Overlay en partida";
                case "optimisationOverlayDesc": return "Caja flotante sobre el juego: CPU/RAM y partidas para todos. Highlights y atajo de repeticion son Premium.";
                case "optimisationOverlayBtn": return "Mostrar/ocultar";
                case "optimisationOverlayOn": return "Overlay: visible";
                case "optimisationOverlayOff": return "Overlay: oculto";
                case "optimisationBoostTitle": return "Game Boost";
                case "optimisationBoostDesc": return "Plan de energia Alto rendimiento mas los extras que marques abajo, mientras juegas. Todo se restaura al cerrar la app.";
                case "optimisationBoostBtnOn": return "Activar Boost";
                case "optimisationBoostBtnOff": return "Desactivar Boost";
                case "optimisationBoostStatusOn": return "Boost: activo (Alto rendimiento)";
                case "optimisationBoostStatusOff": return "Boost: inactivo";
                case "optimisationBoostFreeRam": return "Liberar RAM";
                case "optimisationBoostPriority": return "Warzone prioridad alta";
                case "optimisationBoostVisual": return "Cortar efectos visuales";
                case "optimisationBoostUnavailable": return "Plan de energia Alto rendimiento no disponible en este PC.";
                case "optimisationBoostOn": return "Game Boost activo - plan Alto rendimiento.";
                case "optimisationBoostOff": return "Game Boost inactivo - plan de energia restaurado.";
                case "overlayToggleGames": return "Partidas";
                case "overlayToggleHighlights": return "Highlights";
                case "overlayToggleMeta": return "Meta";
                case "overlayTogglePerf": return "CPU/RAM/GPU";
                case "overlayToggleActions": return "Botones";
                case "overlayHotkeyActive": return "Atajo overlay: ";
                case "actionOverlayHotkeyActive": return "Atajo acciones: ";
                case "premiumSideActive": return "PREMIUM ACTIVO";
                case "premiumSideInactive": return "PREMIUM OFF";
                case "recorderActive": return "RECORDER ACTIVO";
                case "recorderIdle": return "RECORDER LISTO";
                case "restartApp": return "REINICIAR";
                case "compactMode": return "MODO COMPACTO";
                case "compactExit": return "MODO COMPLETO";
                case "supportButton": return "SOPORTE";
                case "updateChecking": return "Buscando update...";
                case "updateAvailable": return "Update disponible: ";
                case "updateCurrent": return "App actualizada";
                case "updateUnavailable": return "Update no disponible";
                case "restartFailed": return "Error al reiniciar: ";
                case "supportCopied": return "Diagnostico copiado para soporte.";
                case "statsSent": return "Stats enviadas a WZPRO.";
                case "clipSaved": return "Clip guardado.";
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
                case "trainingQuizTitle": return "Quiz perfil jugador";
                case "trainingQuizAnalyze": return "ANALIZAR";
                case "trainingRoutineTitle": return "Rutina coach";
                case "trainingRoutineBuild": return "CREAR";
                case "trainingCoachEmpty": return "Responde el quiz y pide al coach un analisis de perfil.";
                case "trainingRoutineEmpty": return "Elige duracion y foco, luego genera la rutina de hoy.";
                case "trainingCoachThinking": return "El coach analiza...";
                case "trainingCoachError": return "Coach no disponible: ";
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
                case "welcomeStatus": return "Usa el mismo Activision ID que Warzone. La app lo necesita para leer tu fila correcta al final.";
                case "stopped": return "Detenido";
                case "disconnected": return "No conectado";
                case "connect": return "CONECTAR A WZPRO";
                case "reconnect": return "RECONECTAR";
                case "verifyEvery": return "Comprobar cada";
                case "seconds": return "segundos";
                case "start": return "INICIAR";
                case "stop": return "PARAR";
                case "hint": return "Importante: tu nombre WZPRO debe coincidir con tu Activision ID / nombre del marcador de Warzone.";
                case "highlightsTitle": return "Highlights Pro";
                case "highlightsToggle": return "CLIPS AUTO";
                case "highlightsDesc": return "Buffer tipo NVIDIA: guarda momentos fuertes y repeticiones manuales en 30, 15, 10 o 5 segundos.";
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
                case "overlayShortcutSide": return "OVERLAY ";
                case "overlayShortcutMissing": return "ATAJO OVERLAY OFF";
                case "actionOverlayShortcutSide": return "ACCIONES ";
                case "actionOverlayShortcutMissing": return "ATAJO ACCIONES OFF";
                case "overlayGames": return "Partidas: ";
                case "overlayHighlights": return "Clips: ";
                case "overlayReplay": return "Replay: ";
                case "overlayActionStart": return "INICIAR TRACKING";
                case "overlayActionStop": return "PARAR";
                case "overlayActionBoost": return "BOOST INACTIVO";
                case "overlayActionBoostOff": return "BOOST ACTIVO";
                case "overlayActionReplay": return "GUARDAR REPLAY";
                case "overlayActionSaveHighlights": return "GUARDAR HIGHLIGHTS";
                case "overlayActionCoach": return "PARTIDA + COACH";
                case "overlayActionClips": return "ABRIR CARPETA CLIPS";
                case "overlayActionOptions": return "OPCIONES";
                case "highlightDetected": return "Momento destacado: ";
                case "highlightWin": return "Victoria";
                case "highlightTop3": return "Top 3";
                case "highlightMultikill": return "Multi-baja";
                case "highlightDominant": return "Victoria dominante";
                case "highlightBigDamage": return "Mucho danio";
                case "highlightKill": return "Baja";
                case "highlightDeath": return "Muerte";
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
                case "duration30": return "Duracion clip: 30 s";
                case "duration15": return "Duracion clip: 15 s";
                case "duration10": return "Duracion clip: 10 s";
                case "duration5": return "Duracion clip: 5 s";
                case "endGameTitle": return "Fin de partida - guardar highlights?";
                case "endGameSocial": return "Guardar highlights";
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
            case "freePageDesc": return "Connecte WZPRO avec le meme Activision ID que dans Warzone. Le lecteur utilise ce nom pour choisir ta ligne.";
            case "settingsPageTitle": return "Settings profil";
            case "settingsPageDesc": return "Renseigne l Activision ID affiche dans Warzone et choisis la photo utilisee par Companion.";
            case "settingsActivisionLabel": return "Activision ID / nom du scoreboard";
            case "settingsPictureLabel": return "URL de photo ou image locale";
            case "settingsChoosePicture": return "CHOISIR";
            case "settingsSave": return "SAUVER";
            case "settingsSaved": return "Profil enregistre. Relance START si le tracking etait deja actif.";
            case "settingsSaving": return "Enregistrement du profil...";
            case "settingsFailed": return "Echec enregistrement profil : ";
            case "settingsNeedConnect": return "Connecte WZPRO avant de modifier ton profil.";
            case "settingsImageTooLarge": return "L image doit faire moins de 500 KB.";
            case "freeStatsTitle": return "Stats session";
            case "freeStatsEmpty": return "Aucune game importee";
            case "freeStatsLoading": return "Chargement stats...";
            case "freeStatsGames": return "games";
            case "freeStatsDetail": return "Kills moy {kills}  |  Degats moy {damage}  |  Win {win}%  |  Top 10 {top}%";
            case "premiumPageTitle": return "Acces premium";
            case "premiumPageDesc": return "Modules payants optionnels pour les clips, la review et plus d automatisations dans la meme app.";
            case "trainingAccess": return "TRAINING LAB";
            case "optimisationAccess": return "OPTIMISATION";
            case "optimisationPageTitle": return "Optimisation";
            case "optimisationPageDesc": return "Active l overlay en jeu et garde un oeil sur la charge systeme pendant que tu joues.";
            case "optimisationOverlayTitle": return "Overlay en jeu";
            case "optimisationOverlayDesc": return "Boite flottante sur le jeu : CPU/RAM et parties pour tous. Moments forts et raccourci replay en Premium.";
            case "optimisationOverlayBtn": return "Afficher/masquer";
            case "optimisationOverlayOn": return "Overlay : affiche";
            case "optimisationOverlayOff": return "Overlay : masque";
            case "optimisationBoostTitle": return "Game Boost";
            case "optimisationBoostDesc": return "Mode Performances elevees plus les options cochees ci-dessous, pendant que tu joues. Tout est restaure a la fermeture de l app.";
            case "optimisationBoostBtnOn": return "Activer Boost";
            case "optimisationBoostBtnOff": return "Desactiver Boost";
            case "optimisationBoostStatusOn": return "Boost : actif (Performances elevees)";
            case "optimisationBoostStatusOff": return "Boost : inactif";
            case "optimisationBoostFreeRam": return "Liberer la RAM";
            case "optimisationBoostPriority": return "Warzone priorite haute";
            case "optimisationBoostVisual": return "Couper effets visuels";
            case "optimisationBoostUnavailable": return "Mode Performances elevees indisponible sur ce PC.";
            case "optimisationBoostOn": return "Game Boost actif - mode Performances elevees.";
            case "optimisationBoostOff": return "Game Boost inactif - mode d alimentation restaure.";
            case "overlayToggleGames": return "Parties";
            case "overlayToggleHighlights": return "Moments forts";
            case "overlayToggleMeta": return "Meta";
            case "overlayTogglePerf": return "CPU/RAM/GPU";
            case "overlayToggleActions": return "Boutons";
            case "overlayHotkeyActive": return "Raccourci overlay : ";
            case "actionOverlayHotkeyActive": return "Raccourci actions : ";
            case "premiumSideActive": return "PREMIUM ACTIF";
            case "premiumSideInactive": return "PREMIUM INACTIF";
            case "recorderActive": return "RECORDER ACTIF";
            case "recorderIdle": return "RECORDER PRET";
            case "restartApp": return "REDEMARRER";
            case "compactMode": return "MODE COMPACT";
            case "compactExit": return "MODE COMPLET";
            case "supportButton": return "SUPPORT";
            case "updateChecking": return "Verification update...";
            case "updateAvailable": return "Update dispo : ";
            case "updateCurrent": return "App a jour";
            case "updateUnavailable": return "Update indisponible";
            case "restartFailed": return "Echec redemarrage : ";
            case "supportCopied": return "Diagnostic copie pour le support.";
            case "statsSent": return "Stats envoyees a WZPRO.";
            case "clipSaved": return "Clip enregistre.";
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
            case "trainingQuizTitle": return "Quiz profil joueur";
            case "trainingQuizAnalyze": return "ANALYSER";
            case "trainingRoutineTitle": return "Routine coach";
            case "trainingRoutineBuild": return "CREER";
            case "trainingCoachEmpty": return "Reponds au quiz, puis demande une analyse de profil au coach.";
            case "trainingRoutineEmpty": return "Choisis une duree et un focus, puis genere la routine du jour.";
            case "trainingCoachThinking": return "Le coach analyse...";
            case "trainingCoachError": return "Coach indisponible : ";
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
            case "welcomeStatus": return "Utilise le meme Activision ID que dans Warzone. L app en a besoin pour lire ta bonne ligne de fin de game.";
            case "stopped": return "Arrete";
            case "disconnected": return "Non connecte";
            case "connect": return "SE CONNECTER A WZPRO";
            case "reconnect": return "RECONNECTER";
            case "verifyEvery": return "Verifier toutes";
            case "seconds": return "secondes";
            case "start": return "START";
            case "stop": return "STOP";
            case "hint": return "Important : ton nom WZPRO doit correspondre a ton Activision ID / nom affiche dans le scoreboard Warzone.";
            case "highlightsTitle": return "Highlights Pro";
            case "highlightsToggle": return "CLIPS AUTO";
            case "highlightsDesc": return "Buffer type NVIDIA : enregistre les moments forts et replays manuels en 30, 15, 10 ou 5 secondes.";
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
            case "overlayShortcutSide": return "OVERLAY ";
            case "overlayShortcutMissing": return "RACCOURCI OVERLAY OFF";
            case "actionOverlayShortcutSide": return "ACTIONS ";
            case "actionOverlayShortcutMissing": return "RACCOURCI ACTIONS OFF";
            case "overlayGames": return "Parties : ";
            case "overlayHighlights": return "Moments forts : ";
            case "overlayReplay": return "Replay : ";
            case "overlayActionStart": return "START TRACKING";
            case "overlayActionStop": return "STOP";
            case "overlayActionBoost": return "BOOST INACTIF";
            case "overlayActionBoostOff": return "BOOST ACTIF";
            case "overlayActionReplay": return "SAVE REPLAY";
            case "overlayActionSaveHighlights": return "SAVE HIGHLIGHTS";
            case "overlayActionCoach": return "GAME + COACH";
            case "overlayActionClips": return "OUVRIR DOSSIER CLIPS";
            case "overlayActionOptions": return "OPTIONS";
            case "highlightDetected": return "Moment fort : ";
            case "highlightWin": return "Victoire";
            case "highlightTop3": return "Top 3";
            case "highlightMultikill": return "Multi-kill";
            case "highlightDominant": return "Victoire dominante";
            case "highlightBigDamage": return "Gros degats";
            case "highlightKill": return "Kill";
            case "highlightDeath": return "Mort";
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
            case "duration30": return "Duree clip : 30 sec";
            case "duration15": return "Duree clip : 15 sec";
            case "duration10": return "Duree clip : 10 sec";
            case "duration5": return "Duree clip : 5 sec";
            case "endGameTitle": return "Fin de game - enregistrer tous les highlights ?";
            case "endGameSocial": return "Enregistrer highlights";
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
        activePage = page == "premium" ? "premium" : page == "training" ? "training" : page == "optimisation" ? "optimisation" : page == "settings" ? "settings" : "free";
        bool free = activePage == "free";
        bool premium = activePage == "premium";
        bool training = activePage == "training";
        bool optimisation = activePage == "optimisation";
        bool settings = activePage == "settings";
        bool compact = compactMode;

        if (freeInfoCard != null) freeInfoCard.Visible = free && !compact;
        if (freeConnectionCard != null) freeConnectionCard.Visible = free || compact;
        if (freeControlsCard != null) freeControlsCard.Visible = free || compact;
        if (freeStatsCard != null) freeStatsCard.Visible = free && !compact;
        importsLabel.Visible = free && !compact;
        historyList.Visible = free && !compact;
        // The journal lives on the free page only; the optimisation page conveys boost/overlay
        // state through the button colour and status labels instead.
        journalLabel.Visible = free || compact;
        logBox.Visible = free || compact;

        if (optimisationInfoCard != null) optimisationInfoCard.Visible = optimisation && !compact;
        if (optimisationOverlayCard != null) optimisationOverlayCard.Visible = optimisation && !compact;
        if (optimisationBoostCard != null) optimisationBoostCard.Visible = optimisation && !compact;

        if (settingsInfoCard != null) settingsInfoCard.Visible = settings && !compact;
        if (settingsProfileCard != null) settingsProfileCard.Visible = settings && !compact;
        if (settings && !compact) RefreshSettingsPage();

        if (premiumInfoCard != null) premiumInfoCard.Visible = premium && !compact;
        if (premiumHighlightsCard != null) premiumHighlightsCard.Visible = premium && !compact;
        if (premiumClipsCard != null) premiumClipsCard.Visible = premium && !compact;
        if (premiumAccessCard != null) premiumAccessCard.Visible = premium && !compact;
        if (premiumAdvancedCard != null) premiumAdvancedCard.Visible = premium && !compact;
        highlightsTitleLabel.Visible = premium && !compact;
        premiumPageTitleLabel.Visible = premium && !compact;
        premiumPageDescLabel.Visible = premium && !compact;
        highlightsToggle.Visible = premium && !compact;
        highlightsDescLabel.Visible = premium && !compact;
        highlightsStatusLabel.Visible = premium && !compact;
        clipsFolderTitleLabel.Visible = premium && !compact;
        clipsFolderValueLabel.Visible = premium && !compact;
        clipsFolderButton.Visible = premium && !compact;
        clipsOpenFolderButton.Visible = premium && !compact;
        premiumCheckoutHintLabel.Visible = premium && !compact;
        premiumAccessStatusLabel.Visible = premium && !compact;
        premiumCheckoutButton.Visible = premium && !compact;
        premiumRefreshButton.Visible = premium && !compact;
        if (statsButton != null) statsButton.Visible = premium && !compact;
        if (gameBarButton != null) gameBarButton.Visible = premium && !compact;
        if (statsBox != null) statsBox.Visible = premium && !compact;
        if (clipModeCombo != null) clipModeCombo.Visible = premium && !compact;
        if (clipDurationCombo != null) clipDurationCombo.Visible = premium && !compact;
        if (socialFormatCombo != null) socialFormatCombo.Visible = premium && !compact;
        if (musicButton != null) musicButton.Visible = premium && !compact;
        if (musicLabel != null) musicLabel.Visible = premium && !compact;
        if (audioButton != null) audioButton.Visible = premium && !compact;

        if (trainingInfoCard != null) trainingInfoCard.Visible = training && !compact;
        if (trainingGoalCard != null) trainingGoalCard.Visible = training && !compact;
        if (trainingCategoryCard != null) trainingCategoryCard.Visible = training && !compact;
        if (trainingModuleCard != null) trainingModuleCard.Visible = training && !compact;
        if (trainingQuizCard != null) trainingQuizCard.Visible = training && !compact;
        if (trainingRoutineCard != null) trainingRoutineCard.Visible = training && !compact;
        if (trainingReviewCard != null) trainingReviewCard.Visible = false;
        if (trainingReadinessCard != null) trainingReadinessCard.Visible = false;
        if (trainingHeatmapCard != null) trainingHeatmapCard.Visible = false;
        if (training) RefreshTrainingUi();

        UpdateSidebarStatuses();
        StylePageButtons(Theme);
        if (premium && !string.IsNullOrWhiteSpace(deviceToken) && DateTime.UtcNow.Subtract(lastPremiumCheckUtc).TotalSeconds > 45)
        {
            backgroundPremiumCheck = CheckPremiumAccess(false);
        }
        ApplyResponsiveLayout();
    }

    private static int ClampInt(int value, int min, int max)
    {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    private static int ScaleHeight(int baseHeight, double scale, int minHeight)
    {
        return Math.Max(minHeight, (int)Math.Round(baseHeight * scale));
    }

    private void ApplyResponsiveLayout()
    {
        if (ClientSize.Width <= 0 || ClientSize.Height <= 0) return;
        LayoutWelcomePage();
        LayoutAppShell();
        if (mainPanel == null || mainPanel.ClientSize.Width <= 0 || mainPanel.ClientSize.Height <= 0) return;
        int contentX = 34;
        int contentW = Math.Max(1, mainPanel.ClientSize.Width - 68);

        mainPanel.SuspendLayout();
        try
        {
            LayoutTopBar();

            LayoutFreePage(contentX, contentW);
            LayoutPremiumPage(contentX, contentW);
            LayoutTrainingPage(contentX, contentW);
            LayoutOptimisationPage(contentX, contentW);
            LayoutSettingsPage(contentX, contentW);
        }
        finally
        {
            mainPanel.ResumeLayout();
        }
    }

    private void LayoutTopBar()
    {
        if (topBarPanel == null || mainPanel == null) return;
        topBarPanel.SetBounds(0, 0, mainPanel.ClientSize.Width, 72);

        int topW = Math.Max(1, topBarPanel.ClientSize.Width);
        int rightPad = 18;
        int buttonSize = 34;
        int closeX = Math.Max(10, topW - rightPad - buttonSize);
        int minimizeX = Math.Max(10, closeX - buttonSize - 8);
        int actionX = 136;
        int searchW = ClampInt(topW / 5, 126, 240);
        int themeW = 116;
        int overlayW = 132;
        int gameBarW = 158;
        int gameBarX = actionX;
        int overlayX = gameBarX + gameBarW + 10;
        int themeX = overlayX + overlayW + 10;
        int minSearchX = themeX + themeW + 16;
        int searchX = Math.Max(minSearchX, minimizeX - searchW - 18);
        if (searchX + searchW > minimizeX - 12)
        {
            searchW = Math.Max(80, minimizeX - 12 - searchX);
        }

        if (languageBox != null) languageBox.SetBounds(34, 20, 88, 28);
        if (closeButton != null) closeButton.SetBounds(closeX, 16, buttonSize, buttonSize);
        if (minimizeButton != null) minimizeButton.SetBounds(minimizeX, 16, buttonSize, buttonSize);
        if (searchBoxLabel != null) searchBoxLabel.SetBounds(searchX, 16, searchW, 34);
        if (gameBarButton != null) gameBarButton.SetBounds(gameBarX, 18, gameBarW, 30);
        if (overlayButton != null) overlayButton.SetBounds(overlayX, 18, overlayW, 30);
        if (themeButton != null) themeButton.SetBounds(themeX, 18, themeW, 30);
    }

    private void LayoutWelcomePage()
    {
        if (welcomePanel == null) return;
        int w = ClientSize.Width;
        int h = ClientSize.Height;
        welcomePanel.SetBounds(0, 0, w, h);

        int margin = ClampInt(w / 12, 52, 96);
        int panelW = ClampInt((int)(w * 0.30), 260, 330);
        int panelH = ClampInt((int)(h * 0.48), 292, 350);
        int panelX = Math.Max(margin + 420, w - margin - panelW);
        int panelY = ClampInt((h - panelH) / 2, 112, 172);
        int textRight = Math.Max(margin + 360, panelX - 34);
        int textW = Math.Max(360, textRight - margin);

        if (welcomeLanguageBox != null) welcomeLanguageBox.SetBounds(margin, ClampInt(h / 12, 34, 58), 220, 34);
        if (welcomeKickerLabel != null) welcomeKickerLabel.SetBounds(margin, ClampInt((int)(h * 0.20), 110, 146), Math.Min(270, textW), 34);
        if (welcomeTitleLabel != null) welcomeTitleLabel.SetBounds(margin, ClampInt((int)(h * 0.31), 176, 220), textW, ClampInt((int)(h * 0.24), 128, 172));
        if (welcomeSubtitleLabel != null) welcomeSubtitleLabel.SetBounds(margin, ClampInt((int)(h * 0.52), 318, 372), Math.Min(430, textW), 70);
        if (welcomeStatsLabel != null) welcomeStatsLabel.SetBounds(margin, ClampInt((int)(h * 0.70), 430, h - 120), textW, 58);

        if (welcomeLoginPanel != null)
        {
            welcomeLoginPanel.SetBounds(panelX, panelY, panelW, panelH);
            int innerW = panelW - 48;
            if (welcomeLoginTitleLabel != null) welcomeLoginTitleLabel.SetBounds(24, 34, innerW, 60);
            if (welcomeConnectButton != null) welcomeConnectButton.SetBounds(32, 122, panelW - 64, 44);
            if (welcomeSiteButton != null) welcomeSiteButton.SetBounds(32, 180, panelW - 64, 38);
            if (welcomeLoginStatusLabel != null) welcomeLoginStatusLabel.SetBounds(30, Math.Max(236, panelH - 84), panelW - 60, 60);
        }
    }

    private void LayoutAppShell()
    {
        if (sidebarPanel == null || mainPanel == null) return;
        int sidebarW = ClampInt((int)(ClientSize.Width * 0.23), 188, 220);
        sidebarPanel.SetBounds(0, 0, sidebarW, ClientSize.Height);
        mainPanel.SetBounds(sidebarW, 0, Math.Max(1, ClientSize.Width - sidebarW), ClientSize.Height);

        int sidePad = ClampInt(sidebarW / 14, 12, 16);
        int navW = sidebarW - sidePad * 2;
        if (brandLogoBox != null) brandLogoBox.SetBounds(sidePad + 4, 14, navW - 8, 52);
        if (titleLabel != null) titleLabel.SetBounds(sidePad + 4, 18, navW - 8, 38);
        if (freeAccessButton != null) freeAccessButton.SetBounds(sidePad, 86, navW, 42);
        if (premiumButton != null) premiumButton.SetBounds(sidePad, 136, navW, 42);
        if (trainingButton != null) trainingButton.SetBounds(sidePad, 186, navW, 42);
        if (optimisationButton != null) optimisationButton.SetBounds(sidePad, 236, navW, 42);
        if (premiumSidebarLabel != null) premiumSidebarLabel.SetBounds(sidePad, 296, navW, 22);
        if (recorderSidebarLabel != null) recorderSidebarLabel.SetBounds(sidePad, 322, navW, 22);
        if (overlayHotkeySidebarLabel != null) overlayHotkeySidebarLabel.SetBounds(sidePad, 348, navW, 22);
        if (actionOverlayHotkeySidebarLabel != null) actionOverlayHotkeySidebarLabel.SetBounds(sidePad, 374, navW, 22);
        if (updateStatusLabel != null) updateStatusLabel.SetBounds(sidePad, 402, navW, 34);

        if (profilePanel != null)
        {
            int profileH = ClampInt(ClientSize.Height / 7, 86, 104);
            profilePanel.SetBounds(sidePad, Math.Max(526, ClientSize.Height - profileH - 24), navW, profileH);
            if (profilePictureBox != null)
            {
                int pic = ClampInt(profileH - 54, 38, 48);
                profilePictureBox.SetBounds((navW - pic) / 2, (profileH - pic) / 2, pic, pic);
            }
            if (profileNameLabel != null) profileNameLabel.SetBounds(22 + ClampInt(profileH - 54, 38, 48), 18, Math.Max(40, navW - 34 - ClampInt(profileH - 54, 38, 48)), profileH - 34);
        }
    }

    private void LayoutFreePage(int contentX, int contentW)
    {
        int h = mainPanel.ClientSize.Height;
        if (compactMode)
        {
            int cardY = 92;
            int compactConnH = 126;
            int compactControlsH = 112;
            if (freeConnectionCard != null) freeConnectionCard.SetBounds(contentX, cardY, contentW, compactConnH);
            if (freeControlsCard != null) freeControlsCard.SetBounds(contentX, cardY + compactConnH + 14, contentW, compactControlsH);
            int compactConnectW = Math.Min(336, Math.Max(180, contentW - 48));
            if (connectButton != null) connectButton.SetBounds(Math.Max(24, contentW - compactConnectW - 24), 42, compactConnectW, 34);
            int compactStopX = Math.Max(24, contentW - 106);
            int compactStartX = Math.Max(24, compactStopX - 96);
            if (startButton != null) startButton.SetBounds(compactStartX, 14, 82, 34);
            if (stopButton != null) stopButton.SetBounds(compactStopX, 14, 82, 34);
            if (hintLabel != null) hintLabel.SetBounds(24, 66, contentW - 48, 34);
            int logTop = cardY + compactConnH + compactControlsH + 52;
            if (journalLabel != null) journalLabel.SetBounds(contentX, logTop - 24, contentW, 20);
            if (logBox != null) logBox.SetBounds(contentX, logTop, contentW, Math.Max(160, h - logTop - 24));
            return;
        }
        int y = 92;
        int gap = 14;
        int bottom = 24;
        int listLabelH = 20;
        int fixedCards = 126 + 106 + 112 + 92 + gap * 4 + listLabelH + 8 + bottom;
        double scale = Math.Min(1.0, Math.Max(0.78, (double)Math.Max(1, h - 92 - listLabelH - 8 - bottom - gap * 4) / (126 + 106 + 112 + 92 + 56)));

        int infoH = ScaleHeight(126, scale, 98);
        int connH = ScaleHeight(106, scale, 86);
        int controlsH = ScaleHeight(112, scale, 90);
        int statsH = ScaleHeight(92, scale, 76);
        if (h - y < fixedCards) gap = 10;

        if (freeInfoCard != null) freeInfoCard.SetBounds(contentX, y, contentW, infoH);
        y += infoH + gap;
        if (freeConnectionCard != null) freeConnectionCard.SetBounds(contentX, y, contentW, connH);
        y += connH + gap;
        if (freeControlsCard != null) freeControlsCard.SetBounds(contentX, y, contentW, controlsH);
        y += controlsH + gap;
        if (freeStatsCard != null) freeStatsCard.SetBounds(contentX, y, contentW, statsH);
        y += statsH + gap;

        if (freePageTitleLabel != null) freePageTitleLabel.Width = Math.Min(420, contentW - 48);
        if (freePageDescLabel != null) freePageDescLabel.Width = contentW - 48;
        int connectW = Math.Min(336, Math.Max(180, contentW - 48));
        if (connectButton != null) connectButton.SetBounds(Math.Max(24, contentW - connectW - 24), 34, connectW, 34);
        if (hintLabel != null) hintLabel.SetBounds(24, Math.Max(58, controlsH - 46), contentW - 48, 34);
        int stopX = Math.Max(24, contentW - 106);
        int startX = Math.Max(24, stopX - 96);
        if (startButton != null) startButton.SetBounds(startX, 14, 82, 34);
        if (stopButton != null) stopButton.SetBounds(stopX, 14, 82, 34);
        if (freeStatsTitleLabel != null) freeStatsTitleLabel.SetBounds(24, 14, Math.Min(220, contentW - 48), 22);
        if (freeStatsSummaryLabel != null) freeStatsSummaryLabel.SetBounds(24, 40, Math.Min(300, contentW - 48), 28);
        if (freeStatsDetailLabel != null)
        {
            int detailX = contentW > 520 ? 340 : 24;
            int detailY = contentW > 520 ? 24 : 64;
            freeStatsDetailLabel.SetBounds(detailX, detailY, Math.Max(180, contentW - detailX - 24), Math.Max(28, statsH - detailY - 8));
        }

        int colGap = 24;
        int colW = Math.Max(180, (contentW - colGap) / 2);
        int listY = y + listLabelH + 4;
        int listH = Math.Max(44, h - listY - bottom);
        if (importsLabel != null) importsLabel.SetBounds(contentX, y, colW, listLabelH);
        if (historyList != null) historyList.SetBounds(contentX, listY, colW, listH);
        if (journalLabel != null && activePage == "free") journalLabel.SetBounds(contentX + colW + colGap, y, colW, listLabelH);
        if (logBox != null && activePage == "free") logBox.SetBounds(contentX + colW + colGap, listY, colW, listH);
    }

    private void LayoutPremiumPage(int contentX, int contentW)
    {
        int top = 92;
        int bottom = 20;
        int available = Math.Max(1, mainPanel.ClientSize.Height - top - bottom);
        int[] baseHeights = new[] { 106, 126, 94, 106, 124 };
        int[] minHeights = new[] { 82, 96, 74, 82, 110 };
        int gap = ClampInt((available - 556) / 4, 10, 18);
        double scale = Math.Min(1.0, (double)Math.Max(1, available - gap * 4) / 556);

        Panel[] cards = new[] { premiumInfoCard, premiumHighlightsCard, premiumClipsCard, premiumAccessCard, premiumAdvancedCard };
        int y = top;
        for (int i = 0; i < cards.Length; i++)
        {
            int cardH = ScaleHeight(baseHeights[i], scale, minHeights[i]);
            if (cards[i] != null) cards[i].SetBounds(contentX, y, contentW, cardH);
            y += cardH + gap;
        }

        if (premiumPageTitleLabel != null) premiumPageTitleLabel.Width = Math.Min(420, contentW - 48);
        if (premiumPageDescLabel != null) premiumPageDescLabel.Width = contentW - 48;
        if (highlightsToggle != null) highlightsToggle.SetBounds(Math.Max(24, contentW - 262), 16, 238, 28);
        if (highlightsDescLabel != null) highlightsDescLabel.Width = contentW - 48;
        if (highlightsStatusLabel != null) highlightsStatusLabel.SetBounds(24, Math.Max(70, premiumHighlightsCard.Height - 30), contentW - 48, 22);
        if (clipsFolderValueLabel != null) clipsFolderValueLabel.Width = Math.Max(220, contentW - 246);
        int openX = Math.Max(24, contentW - 98);
        int chooseX = Math.Max(24, openX - 92);
        if (clipsFolderButton != null) clipsFolderButton.SetBounds(chooseX, 42, 82, 34);
        if (clipsOpenFolderButton != null) clipsOpenFolderButton.SetBounds(openX, 42, 74, 34);
        int premiumButtonW = Math.Min(286, Math.Max(180, contentW - 48));
        int premiumButtonX = Math.Max(24, contentW - premiumButtonW - 24);
        if (premiumCheckoutButton != null) premiumCheckoutButton.SetBounds(premiumButtonX, 16, premiumButtonW, 38);
        if (premiumRefreshButton != null) premiumRefreshButton.SetBounds(premiumButtonX, 62, premiumButtonW, 34);

        if (premiumAdvancedCard != null)
        {
            int cardH = premiumAdvancedCard.Height;
            int rightX = 222;
            int rightW = Math.Max(180, contentW - rightX - 12);
            if (statsButton != null) statsButton.SetBounds(12, 8, 200, 26);
            int formatY = Math.Max(86, cardH - 30);
            int durationY = Math.Max(60, formatY - 26);
            int modeY = Math.Max(34, durationY - 26);
            if (clipModeCombo != null) clipModeCombo.SetBounds(12, modeY, 210, 24);
            if (clipDurationCombo != null) clipDurationCombo.SetBounds(12, durationY, 210, 24);
            if (socialFormatCombo != null) socialFormatCombo.SetBounds(12, formatY, 210, 24);
            if (statsBox != null) statsBox.SetBounds(rightX, 8, rightW, Math.Max(46, cardH - 52));
            int toolY = Math.Max(42, cardH - 34);
            if (musicButton != null) musicButton.SetBounds(rightX, toolY, 136, 24);
            if (musicLabel != null) musicLabel.SetBounds(rightX + 146, toolY + 4, Math.Max(80, rightW - 322), 16);
            if (audioButton != null) audioButton.SetBounds(rightX + rightW - 156, toolY, 156, 24);
        }
    }

    private void LayoutSettingsPage(int contentX, int contentW)
    {
        int y = 92;
        if (settingsInfoCard != null) settingsInfoCard.SetBounds(contentX, y, contentW, 112);
        y += 132;
        if (settingsProfileCard != null) settingsProfileCard.SetBounds(contentX, y, contentW, 244);

        if (settingsPageTitleLabel != null) settingsPageTitleLabel.Width = Math.Min(420, contentW - 48);
        if (settingsPageDescLabel != null) settingsPageDescLabel.SetBounds(24, 62, contentW - 48, 42);
        if (settingsActivisionBox != null) settingsActivisionBox.SetBounds(24, 52, Math.Min(360, contentW - 48), 24);

        int previewY = 124;
        int urlX = 96;
        int saveW = 92;
        int chooseW = 108;
        int saveX = Math.Max(urlX, contentW - saveW - 24);
        int chooseX = Math.Max(urlX, saveX - chooseW - 16);
        int urlW = Math.Max(180, chooseX - urlX - 14);
        if (settingsPicturePreviewBox != null) settingsPicturePreviewBox.SetBounds(24, previewY - 4, 58, 58);
        if (settingsPictureUrlBox != null) settingsPictureUrlBox.SetBounds(urlX, previewY, urlW, 24);
        if (settingsChoosePictureButton != null) settingsChoosePictureButton.SetBounds(chooseX, previewY - 2, chooseW, 28);
        if (settingsSaveButton != null) settingsSaveButton.SetBounds(saveX, previewY - 2, saveW, 28);
        if (settingsStatusLabel != null) settingsStatusLabel.SetBounds(urlX, 164, Math.Max(200, contentW - urlX - 24), 56);
    }

    private void LayoutTrainingPage(int contentX, int contentW)
    {
        int h = mainPanel.ClientSize.Height;
        int y = 92;
        int gap = 14;
        int bottom = 24;
        int infoH = ClampInt((int)(h * 0.10), 66, 78);
        int goalH = ClampInt((int)(h * 0.48), 360, 430);

        if (trainingInfoCard != null) trainingInfoCard.SetBounds(contentX, y, contentW, infoH);
        y += infoH + gap;
        if (trainingGoalCard != null) trainingGoalCard.SetBounds(contentX, y, contentW, goalH);

        if (trainingGoalDescLabel() != null) trainingGoalDescLabel().Width = contentW - 48;
        int buttonGap = 10;
        int buttonW = Math.Max(80, (contentW - 48 - buttonGap * 3) / 4);
        int buttonY = 76;
        if (trainingGoalSurviveButton != null) trainingGoalSurviveButton.SetBounds(24, buttonY, buttonW, 30);
        if (trainingGoalFinishButton != null) trainingGoalFinishButton.SetBounds(24 + (buttonW + buttonGap), buttonY, buttonW, 30);
        if (trainingGoalRotateButton != null) trainingGoalRotateButton.SetBounds(24 + (buttonW + buttonGap) * 2, buttonY, buttonW, 30);
        if (trainingGoalCommsButton != null) trainingGoalCommsButton.SetBounds(24 + (buttonW + buttonGap) * 3, buttonY, buttonW, 30);

        int moduleTop = 122;
        int journalH = Math.Max(222, goalH - moduleTop - 18);
        int categoryW = ClampInt((int)(contentW * 0.30), 200, 246);
        int moduleX = categoryW + 34;
        int moduleW = Math.Max(300, contentW - moduleX - 24);
        if (trainingCategoryCard != null) trainingCategoryCard.SetBounds(18, moduleTop, categoryW, journalH);
        if (trainingModuleCard != null) trainingModuleCard.SetBounds(moduleX, moduleTop, moduleW, journalH);
        if (trainingReviewCard != null) trainingReviewCard.SetBounds(contentX, y, categoryW, Math.Min(150, journalH));
        if (trainingReadinessCard != null) trainingReadinessCard.SetBounds(contentX + moduleX, y, moduleW, Math.Min(150, journalH));
        if (trainingHeatmapCard != null) trainingHeatmapCard.SetBounds(contentX, y, contentW, Math.Min(112, journalH));
        if (trainingCategoryList != null) trainingCategoryList.SetBounds(14, 44, Math.Max(160, categoryW - 28), Math.Max(110, journalH - 62));

        Label title = NamedLabel(trainingModuleCard, "trainingModuleTitleLabel");
        if (title != null) title.Width = moduleW - 36;
        Label desc = NamedLabel(trainingModuleCard, "trainingModuleDescLabel");
        if (desc != null) desc.Width = moduleW - 36;
        int checkW = ClampInt((int)(moduleW * 0.52), 210, 286);
        int noteX = 18 + checkW + 18;
        int noteW = Math.Max(132, moduleW - noteX - 18);
        if (trainingModuleCheck1 != null) trainingModuleCheck1.SetBounds(18, 92, checkW, 22);
        if (trainingModuleCheck2 != null) trainingModuleCheck2.SetBounds(18, 116, checkW, 22);
        if (trainingModuleCheck3 != null) trainingModuleCheck3.SetBounds(18, 140, checkW, 22);
        if (trainingModuleCheck4 != null) trainingModuleCheck4.SetBounds(18, 164, checkW, 22);
        if (trainingModuleCheck5 != null) trainingModuleCheck5.SetBounds(18, 188, checkW, 22);
        Label status = NamedLabel(trainingModuleCard, "trainingModuleStatusLabel");
        if (status != null) status.SetBounds(18, Math.Max(204, journalH - 24), Math.Max(160, moduleW - 36), 18);
        int notesY = 94;
        Label notesLabel = NamedLabel(trainingModuleCard, "trainingModuleNotesLabel");
        if (notesLabel != null) notesLabel.SetBounds(noteX, notesY, noteW, 18);
        if (trainingModuleNotesBox != null) trainingModuleNotesBox.SetBounds(noteX, notesY + 22, noteW, 56);
        int moduleButtonW = Math.Max(74, (noteW - 8) / 2);
        if (trainingModuleDoneButton != null) trainingModuleDoneButton.SetBounds(noteX, notesY + 86, moduleButtonW, 28);
        if (trainingModuleResetButton != null) trainingModuleResetButton.SetBounds(noteX + moduleButtonW + 8, notesY + 86, moduleButtonW, 28);

        y += goalH + gap;
        int toolH = Math.Max(150, h - y - bottom);
        int splitGap = 14;
        int quizW = ClampInt((int)(contentW * 0.48), 310, 390);
        int routineX = contentX + quizW + splitGap;
        int routineW = Math.Max(300, contentW - quizW - splitGap);
        if (trainingQuizCard != null) trainingQuizCard.SetBounds(contentX, y, quizW, toolH);
        if (trainingRoutineCard != null) trainingRoutineCard.SetBounds(routineX, y, routineW, toolH);
        if (trainingQuizStyleCombo != null) trainingQuizStyleCombo.SetBounds(18, 44, Math.Max(118, (quizW - 54) / 2), 24);
        if (trainingQuizInputCombo != null) trainingQuizInputCombo.SetBounds(36 + Math.Max(118, (quizW - 54) / 2), 44, Math.Max(118, (quizW - 54) / 2), 24);
        if (trainingQuizTeamCombo != null) trainingQuizTeamCombo.SetBounds(18, 78, Math.Max(118, (quizW - 54) / 2), 24);
        if (trainingQuizWeaknessCombo != null) trainingQuizWeaknessCombo.SetBounds(36 + Math.Max(118, (quizW - 54) / 2), 78, Math.Max(118, (quizW - 54) / 2), 24);
        if (trainingQuizPaceCombo != null) trainingQuizPaceCombo.SetBounds(18, 112, Math.Max(118, (quizW - 54) / 2), 24);
        if (trainingQuizAnalyzeButton != null) trainingQuizAnalyzeButton.SetBounds(36 + Math.Max(118, (quizW - 54) / 2), 110, Math.Max(118, (quizW - 54) / 2), 30);
        if (trainingCoachResultLabel != null) trainingCoachResultLabel.SetBounds(18, 148, Math.Max(220, quizW - 36), Math.Max(28, toolH - 158));
        if (trainingRoutineDurationCombo != null) trainingRoutineDurationCombo.SetBounds(18, 44, 112, 24);
        int routineButtonW = 108;
        int routineButtonX = Math.Max(228, routineW - routineButtonW - 18);
        int routineFocusW = Math.Max(86, routineButtonX - 154);
        if (trainingRoutineFocusCombo != null) trainingRoutineFocusCombo.SetBounds(142, 44, routineFocusW, 24);
        if (trainingRoutineButton != null) trainingRoutineButton.SetBounds(routineButtonX, 42, routineButtonW, 30);
        if (trainingRoutineResultBox != null) trainingRoutineResultBox.SetBounds(18, 84, Math.Max(220, routineW - 36), Math.Max(58, toolH - 104));

        Label reviewDesc = NamedLabel(trainingReadinessCard, "trainingReadinessDescLabel");
        if (reviewDesc != null) reviewDesc.Width = Math.Max(180, moduleW - 40);
        Label heatmapDesc = NamedLabel(trainingHeatmapCard, "trainingHeatmapDescLabel");
        if (heatmapDesc != null) heatmapDesc.Width = contentW - 48;
        int zoneGap = 10;
        int resetW = 112;
        int zoneW = Math.Max(76, (contentW - 48 - resetW - zoneGap * 4) / 4);
        int zoneY = trainingHeatmapCard != null ? Math.Max(72, trainingHeatmapCard.Height - 44) : 72;
        if (trainingZoneAButton != null) trainingZoneAButton.SetBounds(24, zoneY, zoneW, 30);
        if (trainingZoneBButton != null) trainingZoneBButton.SetBounds(24 + (zoneW + zoneGap), zoneY, zoneW, 30);
        if (trainingZoneCButton != null) trainingZoneCButton.SetBounds(24 + (zoneW + zoneGap) * 2, zoneY, zoneW, 30);
        if (trainingZoneDButton != null) trainingZoneDButton.SetBounds(24 + (zoneW + zoneGap) * 3, zoneY, zoneW, 30);
        if (trainingResetButton != null) trainingResetButton.SetBounds(Math.Max(24, contentW - resetW - 24), zoneY, resetW, 30);
    }

    private Label trainingGoalDescLabel()
    {
        return NamedLabel(trainingGoalCard, "trainingGoalDescLabel");
    }

    private void LayoutOptimisationPage(int contentX, int contentW)
    {
        if (optimisationInfoCard == null || optimisationOverlayCard == null) return;
        if (compactMode) return; // compact layout positions the journal via the free-page path
        int h = mainPanel.ClientSize.Height;
        int pageTop = 92;
        int infoH = 84;
        int overlayTop = pageTop + infoH + 12;
        int overlayH = 140;
        optimisationInfoCard.SetBounds(contentX, pageTop, contentW, infoH);
        optimisationOverlayCard.SetBounds(contentX, overlayTop, contentW, overlayH);
        if (optimisationPageDescLabel != null) optimisationPageDescLabel.Width = contentW - 48;
        if (optimisationOverlayDescLabel != null) optimisationOverlayDescLabel.Width = Math.Max(240, contentW - 210);
        if (overlayToggleButton != null) overlayToggleButton.SetBounds(Math.Max(280, contentW - 170), 46, 150, 40);
        // Pack the line checkboxes left-to-right by their measured width so longer
        // localized labels (FR/ES) never overlap; fixed x positions could collide.
        CheckBox[] overlayChecks = { overlayGamesCheck, overlayHighlightsCheck, overlayMetaCheck, overlayPerfCheck };
        int checkX = 24;
        foreach (CheckBox cb in overlayChecks)
        {
            if (cb == null) continue;
            cb.Location = new Point(checkX, 82);
            checkX += cb.PreferredSize.Width + 22;
        }
        if (optimisationOverlayStatusLabel != null) optimisationOverlayStatusLabel.Width = contentW - 48;

        int boostTop = overlayTop + overlayH + 12;
        int boostH = 156;
        if (optimisationBoostCard != null) optimisationBoostCard.SetBounds(contentX, boostTop, contentW, boostH);
        if (optimisationBoostDescLabel != null) optimisationBoostDescLabel.Width = Math.Max(240, contentW - 210);
        if (gameBoostButton != null) gameBoostButton.SetBounds(Math.Max(280, contentW - 170), 46, 150, 40);
        // Pack the boost option checkboxes left-to-right by measured width so localized labels never overlap.
        CheckBox[] boostChecks = { boostFreeRamCheck, boostPriorityCheck, boostVisualCheck };
        int boostCheckX = 24;
        foreach (CheckBox cb in boostChecks)
        {
            if (cb == null) continue;
            cb.Location = new Point(boostCheckX, 92);
            boostCheckX += cb.PreferredSize.Width + 22;
        }
        if (optimisationBoostStatusLabel != null) optimisationBoostStatusLabel.Width = contentW - 48;
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
        trainingCoachResult = "";
        trainingRoutineResult = "";
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

    private string SelectedComboText(ComboBox combo)
    {
        return combo != null && combo.SelectedItem != null ? combo.SelectedItem.ToString() : "";
    }

    private async Task RunTrainingCoach(string mode)
    {
        if (string.IsNullOrWhiteSpace(deviceToken))
        {
            AddLogLine(T("connectFirst"));
            return;
        }

        SaveCurrentTrainingModuleState();
        bool routineMode = mode == "routine";
        if (trainingQuizAnalyzeButton != null) trainingQuizAnalyzeButton.Enabled = false;
        if (trainingRoutineButton != null) trainingRoutineButton.Enabled = false;
        if (routineMode && trainingRoutineResultBox != null) trainingRoutineResultBox.Text = T("trainingCoachThinking");
        if (!routineMode && trainingCoachResultLabel != null) trainingCoachResultLabel.Text = T("trainingCoachThinking");

        try
        {
            string json = "{"
                + "\"mode\":\"" + JsonEscape(routineMode ? "routine" : "profile") + "\","
                + "\"locale\":\"" + JsonEscape(languageCode) + "\","
                + "\"goal\":\"" + JsonEscape(trainingGoal) + "\","
                + "\"module\":\"" + JsonEscape(trainingModuleKey) + "\","
                + "\"moduleTitle\":\"" + JsonEscape(TrainingModuleTitle(trainingModuleKey)) + "\","
                + "\"moduleNote\":\"" + JsonEscape(GetTrainingModuleNote(trainingModuleKey)) + "\","
                + "\"moduleProgress\":\"" + JsonEscape(TrainingModuleStatusText(trainingModuleKey)) + "\","
                + "\"quiz\":{"
                + "\"style\":\"" + JsonEscape(SelectedComboText(trainingQuizStyleCombo)) + "\","
                + "\"input\":\"" + JsonEscape(SelectedComboText(trainingQuizInputCombo)) + "\","
                + "\"team\":\"" + JsonEscape(SelectedComboText(trainingQuizTeamCombo)) + "\","
                + "\"weakness\":\"" + JsonEscape(SelectedComboText(trainingQuizWeaknessCombo)) + "\","
                + "\"pace\":\"" + JsonEscape(SelectedComboText(trainingQuizPaceCombo)) + "\""
                + "},"
                + "\"routine\":{"
                + "\"duration\":\"" + JsonEscape(SelectedComboText(trainingRoutineDurationCombo)) + "\","
                + "\"focus\":\"" + JsonEscape(SelectedComboText(trainingRoutineFocusCombo)) + "\""
                + "}"
                + "}";

            string body = await ApiPostAuth("/api/companion/training-coach", json).ConfigureAwait(false);
            string playerType = JsonString(body, "playerType");
            string focus = JsonString(body, "focus");
            string analysis = JsonString(body, "analysis");
            string routine = JsonString(body, "routine");

            SafeUi(delegate
            {
                if (!string.IsNullOrWhiteSpace(analysis))
                {
                    trainingCoachResult = (string.IsNullOrWhiteSpace(playerType) ? "" : playerType + " - ")
                        + (string.IsNullOrWhiteSpace(focus) ? "" : focus + Environment.NewLine)
                        + analysis;
                }
                if (!string.IsNullOrWhiteSpace(routine)) trainingRoutineResult = routine;
                if (trainingCoachResultLabel != null) trainingCoachResultLabel.Text = string.IsNullOrWhiteSpace(trainingCoachResult) ? T("trainingCoachEmpty") : trainingCoachResult;
                if (trainingRoutineResultBox != null) trainingRoutineResultBox.Text = string.IsNullOrWhiteSpace(trainingRoutineResult) ? T("trainingRoutineEmpty") : trainingRoutineResult;
                SaveSession();
            });
        }
        catch (Exception ex)
        {
            SafeUi(delegate
            {
                string message = T("trainingCoachError") + ex.Message;
                if (routineMode && trainingRoutineResultBox != null) trainingRoutineResultBox.Text = message;
                if (!routineMode && trainingCoachResultLabel != null) trainingCoachResultLabel.Text = message;
                AddLogLine(message);
            });
        }
        finally
        {
            SafeUi(delegate
            {
                if (trainingQuizAnalyzeButton != null) trainingQuizAnalyzeButton.Enabled = true;
                if (trainingRoutineButton != null) trainingRoutineButton.Enabled = true;
                RefreshTrainingUi();
            });
        }
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
        label = NamedLabel(trainingQuizCard, "trainingQuizTitleLabel");
        if (label != null) label.Text = T("trainingQuizTitle");
        label = NamedLabel(trainingRoutineCard, "trainingRoutineTitleLabel");
        if (label != null) label.Text = T("trainingRoutineTitle");

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
        if (trainingQuizAnalyzeButton != null) trainingQuizAnalyzeButton.Text = T("trainingQuizAnalyze");
        if (trainingRoutineButton != null) trainingRoutineButton.Text = T("trainingRoutineBuild");
        if (trainingCoachResultLabel != null) trainingCoachResultLabel.Text = string.IsNullOrWhiteSpace(trainingCoachResult) ? T("trainingCoachEmpty") : trainingCoachResult;
        if (trainingRoutineResultBox != null) trainingRoutineResultBox.Text = string.IsNullOrWhiteSpace(trainingRoutineResult) ? T("trainingRoutineEmpty") : trainingRoutineResult;
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
        StylePrimaryButton(trainingQuizAnalyzeButton, theme);
        StylePrimaryButton(trainingRoutineButton, theme);
        StyleComboBox(trainingQuizStyleCombo, theme);
        StyleComboBox(trainingQuizInputCombo, theme);
        StyleComboBox(trainingQuizTeamCombo, theme);
        StyleComboBox(trainingQuizWeaknessCombo, theme);
        StyleComboBox(trainingQuizPaceCombo, theme);
        StyleComboBox(trainingRoutineDurationCombo, theme);
        StyleComboBox(trainingRoutineFocusCombo, theme);
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

    private void StartWindowDrag(object sender, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left) return;
        windowDragging = true;
        windowDragStart = e.Location;
    }

    private void DragWindow(object sender, MouseEventArgs e)
    {
        if (!windowDragging || sender == null) return;
        Control control = sender as Control;
        if (control == null) return;
        Point screenPoint = control.PointToScreen(e.Location);
        Location = new Point(screenPoint.X - windowDragStart.X, screenPoint.Y - windowDragStart.Y);
    }

    private void EndWindowDrag(object sender, MouseEventArgs e)
    {
        windowDragging = false;
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
            if (clipDurationCombo != null)
            {
                clipDurationCombo.Items.Clear();
                clipDurationCombo.Items.Add(T("duration30"));
                clipDurationCombo.Items.Add(T("duration15"));
                clipDurationCombo.Items.Add(T("duration10"));
                clipDurationCombo.Items.Add(T("duration5"));
                clipDurationCombo.SelectedIndex = highlightClipSeconds == 30 ? 0 : highlightClipSeconds == 10 ? 2 : highlightClipSeconds == 5 ? 3 : 1;
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

    private void OnClipDurationChanged()
    {
        if (populatingCombos || clipDurationCombo == null) return;
        int i = clipDurationCombo.SelectedIndex;
        highlightClipSeconds = i == 0 ? 30 : i == 2 ? 10 : i == 3 ? 5 : 15;
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
        UpdateSidebarStatuses();
        if (overlayForm != null && overlayForm.Visible) UpdateOverlay();
    }

    private void UpdateSidebarStatuses()
    {
        var theme = Theme;
        if (premiumSidebarLabel != null)
        {
            premiumSidebarLabel.Text = premiumAccessActive ? T("premiumSideActive") : T("premiumSideInactive");
            premiumSidebarLabel.ForeColor = premiumAccessActive ? theme.Success : theme.Muted;
        }
        if (recorderSidebarLabel != null)
        {
            recorderSidebarLabel.Text = recorderActive ? T("recorderActive") : T("recorderIdle");
            recorderSidebarLabel.ForeColor = recorderActive ? theme.Success : theme.Muted;
        }
        if (overlayHotkeySidebarLabel != null)
        {
            overlayHotkeySidebarLabel.Text = overlayHotkeyRegistered && !string.IsNullOrWhiteSpace(activeOverlayHotkeyLabel)
                ? T("overlayShortcutSide") + activeOverlayHotkeyLabel
                : T("overlayShortcutMissing");
            overlayHotkeySidebarLabel.ForeColor = overlayHotkeyRegistered ? theme.Info : theme.Muted;
        }
        if (actionOverlayHotkeySidebarLabel != null)
        {
            actionOverlayHotkeySidebarLabel.Text = actionOverlayHotkeyRegistered && !string.IsNullOrWhiteSpace(activeActionOverlayHotkeyLabel)
                ? T("actionOverlayShortcutSide") + activeActionOverlayHotkeyLabel
                : T("actionOverlayShortcutMissing");
            actionOverlayHotkeySidebarLabel.ForeColor = actionOverlayHotkeyRegistered ? theme.Info : theme.Muted;
        }
        if (compactButton != null) compactButton.Text = compactMode ? T("compactExit") : T("compactMode");
        if (restartButton != null) restartButton.Text = T("restartApp");
        if (supportButton != null) supportButton.Text = T("supportButton");
        if (updateStatusLabel != null && string.IsNullOrWhiteSpace(updateStatusLabel.Text)) updateStatusLabel.Text = T("updateCurrent");
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
                        if (metaTodayLabel != null) metaTodayLabel.Text = "";
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

    private void ApplyFreeStatsText(string games, string kd, string kills, string damage, string winRate, string topTenRate)
    {
        if (freeStatsSummaryLabel == null || freeStatsDetailLabel == null) return;

        int gameCount = 0;
        int.TryParse(games, out gameCount);
        if (gameCount <= 0)
        {
            freeStatsSummaryLabel.Text = T("freeStatsEmpty");
            freeStatsDetailLabel.Text = "";
            return;
        }

        string cleanKd = string.IsNullOrWhiteSpace(kd) ? "0" : kd;
        string cleanKills = string.IsNullOrWhiteSpace(kills) ? "0" : kills;
        string cleanDamage = string.IsNullOrWhiteSpace(damage) ? "0" : damage;
        string cleanWin = string.IsNullOrWhiteSpace(winRate) ? "0" : winRate;
        string cleanTop = string.IsNullOrWhiteSpace(topTenRate) ? "0" : topTenRate;

        freeStatsSummaryLabel.Text = "K/D " + cleanKd + "  |  " + gameCount + " " + T("freeStatsGames");
        freeStatsDetailLabel.Text = T("freeStatsDetail")
            .Replace("{kills}", cleanKills)
            .Replace("{damage}", cleanDamage)
            .Replace("{win}", cleanWin)
            .Replace("{top}", cleanTop);
    }

    // Free stats summary + premium advanced tracker/AI coach when the account has access.
    private async Task FetchStats()
    {
        if (string.IsNullOrWhiteSpace(deviceToken)) return;
        SafeUi(delegate
        {
            if (statsBox != null) statsBox.Text = T("statsLoading");
            if (freeStatsSummaryLabel != null) freeStatsSummaryLabel.Text = T("freeStatsLoading");
            if (freeStatsDetailLabel != null) freeStatsDetailLabel.Text = "";
        });
        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Get, site + "/api/companion/stats"))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", deviceToken);
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!response.IsSuccessStatusCode)
                    {
                        SafeUi(delegate
                        {
                            if (statsBox != null) statsBox.Text = T("statsFailed");
                            if (freeStatsSummaryLabel != null) freeStatsSummaryLabel.Text = T("statsFailed");
                            if (freeStatsDetailLabel != null) freeStatsDetailLabel.Text = "";
                        });
                        return;
                    }

                    string games = JsonNumber(body, "games");
                    string level = JsonString(body, "level");
                    string kd = JsonNumber(body, "kd");
                    string kills = JsonNumber(body, "kills");
                    string dmg = JsonNumber(body, "damage");
                    string wr = JsonNumber(body, "winRate");
                    string top = JsonNumber(body, "topTenRate");
                    string pct = JsonNumber(body, "percentile");
                    bool premium = JsonBool(body, "premium");
                    System.Collections.Generic.List<string> coach = JsonStringArray(body, "coach");

                    SafeUi(delegate
                    {
                        ApplyFreeStatsText(games, kd, kills, dmg, wr, top);
                        if (statsBox != null)
                        {
                            var sb = new System.Text.StringBuilder();
                            if (premium && !string.IsNullOrWhiteSpace(level))
                            {
                                sb.AppendLine(T("statsLevel") + level + " (top " + pct + "%)");
                            }
                            else
                            {
                                sb.AppendLine(T("freeStatsTitle"));
                            }
                            sb.AppendLine("K/D " + (string.IsNullOrWhiteSpace(kd) ? "0" : kd) + "  -  " + (string.IsNullOrWhiteSpace(kills) ? "0" : kills) + " kills  -  " + (string.IsNullOrWhiteSpace(dmg) ? "0" : dmg) + " dmg  -  " + (string.IsNullOrWhiteSpace(wr) ? "0" : wr) + "% win");
                            if (coach.Count > 0)
                            {
                                sb.AppendLine("");
                                foreach (string tip in coach) sb.AppendLine("- " + tip);
                            }
                            else if (!premium)
                            {
                                sb.AppendLine("");
                                sb.AppendLine(T("premiumInactive"));
                            }
                            statsBox.Text = sb.ToString();
                        }
                    });
                }
            }
        }
        catch
        {
            SafeUi(delegate
            {
                if (statsBox != null) statsBox.Text = T("statsFailed");
                if (freeStatsSummaryLabel != null) freeStatsSummaryLabel.Text = T("statsFailed");
                if (freeStatsDetailLabel != null) freeStatsDetailLabel.Text = "";
            });
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
            // Re-validate in case the desktop changed since the overlay was created.
            Point safe = ClampToVisibleScreen(overlayForm.Location.X, overlayForm.Location.Y);
            if (safe != overlayForm.Location) overlayForm.Location = safe;
            UpdateOverlay();
            overlayForm.Show();
        }
        UpdateOverlayStatus();
        AddLogLine(T(overlayForm.Visible ? "optimisationOverlayOn" : "optimisationOverlayOff"));
    }

    private void UpdateOverlayStatus()
    {
        if (optimisationOverlayStatusLabel == null) return;
        bool on = overlayForm != null && overlayForm.Visible;
        optimisationOverlayStatusLabel.Text = (on ? T("optimisationOverlayOn") : T("optimisationOverlayOff"))
            + (overlayHotkeyRegistered ? "  (" + activeOverlayHotkeyLabel + ")" : "");
    }

    private void ToggleActionOverlay()
    {
        EnsureActionOverlay();
        if (actionOverlayForm.Visible)
        {
            actionOverlayForm.Hide();
        }
        else
        {
            RefreshActionOverlay();
            actionOverlayForm.Show();
        }
    }

    private CheckBox OverlayLineCheck(int x, int y)
    {
        CheckBox cb = new CheckBox
        {
            Location = new Point(x, y),
            AutoSize = true,
            Checked = true,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Regular),
            ForeColor = Color.White
        };
        optimisationOverlayCard.Controls.Add(cb);
        return cb;
    }

    private void OnOverlayLineToggle()
    {
        SyncOverlayOptionChecks();
        SaveSession();
        if (overlayForm != null && overlayForm.Visible) UpdateOverlay();
    }

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
        if (gameBoostActive) DisableGameBoost(); else EnableGameBoost();
    }

    private void EnableGameBoost()
    {
        if (gameBoostActive) return;
        // The High Performance plan is hidden on some machines; bail out cleanly if absent.
        if (RunPowercfg("/list").IndexOf(HighPerfSchemeGuid, StringComparison.OrdinalIgnoreCase) < 0)
        {
            ShowToast(T("optimisationBoostUnavailable"));
            return;
        }
        Match m = Regex.Match(RunPowercfg("/getactivescheme"), "[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}");
        if (!m.Success)
        {
            // Can't read the current plan -> don't switch, to avoid stranding the user on High Performance.
            ShowToast(T("optimisationBoostUnavailable"));
            return;
        }
        savedPowerScheme = m.Value;
        RunPowercfg("/setactive " + HighPerfSchemeGuid);
        // Apply the selected extras. Each one captures what it needs to restore on disable/close.
        if (boostVisualEffects) DisableWindowsUiEffects();
        if (boostPriority) RaiseGameProcessPriority();
        if (boostFreeRam) TrimBackgroundWorkingSets();
        gameBoostActive = true;
        UpdateGameBoostStatus();
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
        UpdateGameBoostStatus();
    }

    private void UpdateGameBoostStatus()
    {
        if (gameBoostButton != null)
        {
            gameBoostButton.Text = T(gameBoostActive ? "optimisationBoostBtnOff" : "optimisationBoostBtnOn");
            // The button colour is the primary state cue (no journal): green = boost on, blue = off.
            WzTheme th = Theme;
            Color fill = gameBoostActive ? th.Success : th.Blue;
            gameBoostButton.BackColor = fill;
            gameBoostButton.ForeColor = gameBoostActive ? Color.Black : th.BlueText;
            gameBoostButton.FlatAppearance.BorderColor = fill;
            gameBoostButton.FlatAppearance.MouseOverBackColor = fill;
            gameBoostButton.FlatAppearance.MouseDownBackColor = fill;
        }
        if (optimisationBoostStatusLabel != null)
        {
            optimisationBoostStatusLabel.Text = T(gameBoostActive ? "optimisationBoostStatusOn" : "optimisationBoostStatusOff");
            optimisationBoostStatusLabel.ForeColor = gameBoostActive ? Theme.Success : Theme.Muted;
        }
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

    // Keep a saved overlay position usable: fall back to the primary screen if the point
    // lands on a monitor that is no longer attached. Also accepts negative coordinates
    // (monitors placed left/above the primary), unlike a raw 0..N clamp.
    private static Point ClampToVisibleScreen(int x, int y)
    {
        foreach (Screen s in Screen.AllScreens)
        {
            if (s.Bounds.Contains(x, y)) return new Point(x, y);
        }
        Rectangle wa = Screen.PrimaryScreen.WorkingArea;
        return new Point(wa.Left + 24, wa.Top + 24);
    }

    private void EnsureOverlay()
    {
        if (overlayForm != null) return;
        Point safePos = ClampToVisibleScreen(overlayX, overlayY);
        overlayX = safePos.X;
        overlayY = safePos.Y;
        overlayForm = new NoActivateForm
        {
            FormBorderStyle = FormBorderStyle.None,
            StartPosition = FormStartPosition.Manual,
            TopMost = true,
            ShowInTaskbar = false,
            BackColor = Color.FromArgb(8, 10, 14),
            Opacity = 0.94,
            Size = new Size(336, 86),
            MinimumSize = new Size(336, 86),
            Location = new Point(overlayX, overlayY)
        };
        overlayLabel = new Label
        {
            Location = new Point(0, 0),
            Size = new Size(336, 86),
            ForeColor = Color.White,
            Font = AppFont(9, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft,
            Padding = new Padding(12, 8, 12, 8),
            BackColor = Color.FromArgb(12, 14, 22)
        };
        overlayLabel.MouseDown += delegate(object s, MouseEventArgs e) { overlayDragStart = e.Location; overlayDragging = true; overlayLabel.Capture = true; };
        overlayLabel.MouseUp += delegate
        {
            overlayLabel.Capture = false;
            if (overlayDragging && overlayForm != null)
            {
                overlayX = overlayForm.Location.X;
                overlayY = overlayForm.Location.Y;
                SaveSession();
            }
            overlayDragging = false;
        };
        overlayLabel.MouseMove += delegate(object s, MouseEventArgs e)
        {
            if (overlayDragging)
            {
                overlayForm.Location = new Point(overlayForm.Location.X + e.X - overlayDragStart.X, overlayForm.Location.Y + e.Y - overlayDragStart.Y);
            }
        };
        overlayForm.Controls.Add(overlayLabel);
    }

    private Button OverlayActionButton(int x, int y, int w, string text)
    {
        return new Button
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(w, 28),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(22, 60, 255),
            ForeColor = Color.White,
            Font = AppFont(7, FontStyle.Bold),
            TabStop = false
        };
    }

    private void EnsureActionOverlay()
    {
        if (actionOverlayForm != null) return;
        Rectangle wa = Screen.PrimaryScreen.WorkingArea;
        actionOverlayForm = new NoActivateForm
        {
            FormBorderStyle = FormBorderStyle.None,
            StartPosition = FormStartPosition.Manual,
            TopMost = true,
            ShowInTaskbar = false,
            BackColor = Color.FromArgb(8, 10, 14),
            Opacity = 0.94,
            Size = new Size(336, 230),
            Location = new Point(wa.Right - 360, wa.Top + 96)
        };

        actionOverlayTitleLabel = new Label
        {
            Text = "WZPRO ACTIONS",
            Location = new Point(0, 0),
            Size = new Size(336, 44),
            ForeColor = Color.White,
            Font = AppFont(9, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft,
            Padding = new Padding(12, 8, 12, 8),
            BackColor = Color.FromArgb(12, 14, 22)
        };
        actionOverlayForm.Controls.Add(actionOverlayTitleLabel);

        actionStartStopButton = OverlayActionButton(12, 56, 150, T("overlayActionStart"));
        actionStartStopButton.Click += delegate { if (companionProcess != null && !companionProcess.HasExited) StopCompanion(); else StartCompanion(); RefreshActionOverlay(); };
        actionOverlayForm.Controls.Add(actionStartStopButton);

        actionBoostButton = OverlayActionButton(174, 56, 150, T("overlayActionBoost"));
        actionBoostButton.Click += delegate { ToggleGameBoost(); RefreshActionOverlay(); };
        actionOverlayForm.Controls.Add(actionBoostButton);

        actionReplayButton = OverlayActionButton(12, 92, 150, T("overlayActionReplay"));
        actionReplayButton.Click += delegate { OnManualReplay(); RefreshActionOverlay(); };
        actionOverlayForm.Controls.Add(actionReplayButton);

        actionSaveHighlightsButton = OverlayActionButton(174, 92, 150, T("overlayActionSaveHighlights"));
        actionSaveHighlightsButton.Click += delegate { SavePendingHighlightsFromOverlay(); RefreshActionOverlay(); };
        actionOverlayForm.Controls.Add(actionSaveHighlightsButton);

        actionCoachButton = OverlayActionButton(12, 128, 150, T("overlayActionCoach"));
        actionCoachButton.Click += delegate { ExportFullGameFromOverlay(); RefreshActionOverlay(); };
        actionOverlayForm.Controls.Add(actionCoachButton);

        actionClipsButton = OverlayActionButton(174, 128, 150, T("overlayActionClips"));
        actionClipsButton.Click += delegate { OpenClipsFolder(); };
        actionOverlayForm.Controls.Add(actionClipsButton);

        overlayOptionsButton = OverlayActionButton(12, 164, 312, T("overlayActionOptions"));
        overlayOptionsButton.Click += delegate { ToggleOverlayOptions(); };
        actionOverlayForm.Controls.Add(overlayOptionsButton);

        overlayOptGamesCheck = OverlayOptionCheck(16, 210, T("overlayToggleGames"));
        overlayOptGamesCheck.CheckedChanged += delegate { if (applyingOverlayState) return; overlayShowGames = overlayOptGamesCheck.Checked; OnOverlayOptionChanged(); };
        actionOverlayForm.Controls.Add(overlayOptGamesCheck);

        overlayOptHighlightsCheck = OverlayOptionCheck(174, 210, T("overlayToggleHighlights"));
        overlayOptHighlightsCheck.CheckedChanged += delegate { if (applyingOverlayState) return; overlayShowHighlights = overlayOptHighlightsCheck.Checked; OnOverlayOptionChanged(); };
        actionOverlayForm.Controls.Add(overlayOptHighlightsCheck);

        overlayOptMetaCheck = OverlayOptionCheck(16, 238, T("overlayToggleMeta"));
        overlayOptMetaCheck.CheckedChanged += delegate { if (applyingOverlayState) return; overlayShowMeta = overlayOptMetaCheck.Checked; OnOverlayOptionChanged(); };
        actionOverlayForm.Controls.Add(overlayOptMetaCheck);

        overlayOptPerfCheck = OverlayOptionCheck(174, 238, T("overlayTogglePerf"));
        overlayOptPerfCheck.CheckedChanged += delegate
        {
            if (applyingOverlayState) return;
            overlayShowPerf = overlayOptPerfCheck.Checked;
            if (!overlayShowPerf) { lastIdleTime = lastKernelTime = lastUserTime = 0; perfCpu = -1; perfGpu = -1; }
            OnOverlayOptionChanged();
        };
        actionOverlayForm.Controls.Add(overlayOptPerfCheck);

        RefreshOverlayOptionsVisibility();
    }

    private void RefreshActionOverlay()
    {
        if (actionOverlayForm == null) return;
        bool running = companionProcess != null && !companionProcess.HasExited;
        if (actionOverlayTitleLabel != null)
        {
            actionOverlayTitleLabel.Text = "WZPRO ACTIONS" + (actionOverlayHotkeyRegistered ? "  " + activeActionOverlayHotkeyLabel : "");
        }
        if (actionStartStopButton != null) actionStartStopButton.Text = running ? T("overlayActionStop") : T("overlayActionStart");
        if (actionBoostButton != null) actionBoostButton.Text = T(gameBoostActive ? "overlayActionBoostOff" : "overlayActionBoost");
        SetOverlayActionState(actionStartStopButton, !string.IsNullOrWhiteSpace(deviceToken), false);
        SetOverlayActionState(actionBoostButton, true, false);
        if (actionBoostButton != null && gameBoostActive)
        {
            actionBoostButton.BackColor = Theme.Success;
            actionBoostButton.ForeColor = Color.Black;
        }
        SetOverlayActionState(actionReplayButton, premiumAccessActive, true);
        SetOverlayActionState(actionSaveHighlightsButton, premiumAccessActive && pendingGameClips.Count > 0, true);
        SetOverlayActionState(actionCoachButton, premiumAccessActive && !string.IsNullOrWhiteSpace(pendingUploadedLine), true);
        SetOverlayActionState(actionClipsButton, premiumAccessActive, true);
        RefreshOverlayActions();
    }

    private CheckBox OverlayOptionCheck(int x, int y, string text)
    {
        return new CheckBox
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(146, 22),
            Checked = true,
            FlatStyle = FlatStyle.Flat,
            ForeColor = Color.White,
            BackColor = Color.Transparent,
            Font = AppFont(7, FontStyle.Regular),
            TabStop = false,
            Visible = false
        };
    }

    private void ToggleOverlayOptions()
    {
        overlayOptionsVisible = !overlayOptionsVisible;
        RefreshOverlayOptionsVisibility();
        UpdateOverlay();
    }

    private void RefreshOverlayOptionsVisibility()
    {
        int optionsY = 164;
        int checkY = 210;
        if (overlayOptionsButton != null) overlayOptionsButton.SetBounds(12, optionsY, 312, 28);
        if (overlayOptGamesCheck != null) overlayOptGamesCheck.SetBounds(16, checkY, 146, 22);
        if (overlayOptHighlightsCheck != null) overlayOptHighlightsCheck.SetBounds(174, checkY, 146, 22);
        if (overlayOptMetaCheck != null) overlayOptMetaCheck.SetBounds(16, checkY + 28, 146, 22);
        if (overlayOptPerfCheck != null) overlayOptPerfCheck.SetBounds(174, checkY + 28, 146, 22);

        if (actionOverlayForm != null)
        {
            int closedH = 230;
            int openH = 302;
            actionOverlayForm.Size = overlayOptionsVisible ? new Size(336, openH) : new Size(336, closedH);
        }
        if (overlayOptGamesCheck != null) overlayOptGamesCheck.Visible = overlayOptionsVisible;
        if (overlayOptHighlightsCheck != null) overlayOptHighlightsCheck.Visible = overlayOptionsVisible;
        if (overlayOptMetaCheck != null) overlayOptMetaCheck.Visible = overlayOptionsVisible;
        if (overlayOptPerfCheck != null) overlayOptPerfCheck.Visible = overlayOptionsVisible;
    }

    private void OnOverlayOptionChanged()
    {
        SyncOverlayOptionChecks();
        SaveSession();
        RefreshOverlayOptionsVisibility();
        UpdateOverlay();
    }

    private void SyncOverlayOptionChecks()
    {
        applyingOverlayState = true;
        if (overlayOptGamesCheck != null) { overlayOptGamesCheck.Text = T("overlayToggleGames"); overlayOptGamesCheck.Checked = overlayShowGames; }
        if (overlayOptHighlightsCheck != null) { overlayOptHighlightsCheck.Text = T("overlayToggleHighlights"); overlayOptHighlightsCheck.Checked = overlayShowHighlights; }
        if (overlayOptMetaCheck != null) { overlayOptMetaCheck.Text = T("overlayToggleMeta"); overlayOptMetaCheck.Checked = overlayShowMeta; }
        if (overlayOptPerfCheck != null) { overlayOptPerfCheck.Text = T("overlayTogglePerf"); overlayOptPerfCheck.Checked = overlayShowPerf; }
        applyingOverlayState = false;
    }

    private void UpdateOverlay()
    {
        // Don't resize/repaint mid-drag (the AutoSize form would jitter under the cursor).
        if (overlayLabel == null || overlayDragging) return;
        if (overlayShowPerf) UpdatePerfSample();
        int mins = sessionStartUtc == default(DateTime)
            ? 0
            : Math.Max(0, (int)Math.Round(DateTime.UtcNow.Subtract(sessionStartUtc).TotalMinutes));
        string games = overlayShowGames ? Environment.NewLine + T("overlayGames") + sessionGameCount + "  /  " + mins + " min" : "";
        string meta = (overlayShowMeta && !string.IsNullOrWhiteSpace(metaTodayWeapon)) ? Environment.NewLine + T("metaToday") + metaTodayWeapon : "";
        // RAM is valid from the first sample; CPU/GPU need a moment, so show "--" until ready.
        string gpu = gpuCounterUnavailable ? "" : "  GPU " + (perfGpu >= 0 ? perfGpu.ToString() : "--") + "%";
        string perf = (overlayShowPerf && perfRam >= 0)
            ? Environment.NewLine + "CPU " + (perfCpu >= 0 ? perfCpu.ToString() : "--") + "%  RAM " + perfRam + "%" + gpu
            : "";
        string highlights = (overlayShowHighlights && premiumAccessActive && sessionHighlightCount > 0)
            ? Environment.NewLine + T("overlayHighlights") + sessionHighlightCount
            : "";
        // Show the replay-key reminder only until the player has used it once.
        string replay = (premiumAccessActive && manualReplayHotkeyRegistered && lastManualReplayUtc == DateTime.MinValue)
            ? Environment.NewLine + T("overlayReplay") + activeReplayHotkeyLabel
            : "";
        overlayLabel.Text = "WZPRO" + games + highlights + meta + perf + replay;
        RefreshOverlayActions();
    }

    private void RefreshOverlayActions()
    {
        if (overlayOptionsButton != null) overlayOptionsButton.Text = T("overlayActionOptions");
        SetOverlayActionState(overlayOptionsButton, true, false);
        SyncOverlayOptionChecks();
    }

    private void SetOverlayActionState(Button button, bool enabled, bool premiumAction)
    {
        if (button == null) return;
        button.Enabled = enabled;
        if (!enabled)
        {
            button.BackColor = Color.FromArgb(42, 42, 48);
            button.ForeColor = premiumAction && !premiumAccessActive ? Color.FromArgb(110, 110, 118) : Color.FromArgb(150, 150, 155);
        }
        else
        {
            button.BackColor = Color.FromArgb(22, 60, 255);
            button.ForeColor = Color.White;
        }
    }

    private void SavePendingHighlightsFromOverlay()
    {
        if (!premiumAccessActive || pendingGameClips.Count == 0) return;
        var clipsCopy = new System.Collections.Generic.List<string>(pendingGameClips);
        string fmt = socialFormat;
        System.Threading.Tasks.Task.Run(delegate { BuildMontage(clipsCopy, fmt); });
        pendingGameClips.Clear();
        pendingUploadedLine = "";
        HideEndGameChoice();
        ShowToast(T("clipSaved"));
        UpdateOverlay();
    }

    private void ExportFullGameFromOverlay()
    {
        if (!premiumAccessActive || string.IsNullOrWhiteSpace(pendingUploadedLine)) return;
        ExportFullGame(pendingUploadedLine);
        UpdateOverlay();
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
            UpdateGpuSample();
        }
        catch
        {
            // Perf readout is cosmetic; never let it break the overlay.
        }
    }

    // Sample total GPU 3D-engine utilisation from Windows performance counters. This is heavier
    // than CPU/RAM, so it's throttled to ~1 Hz and disables itself permanently if unavailable.
    private void UpdateGpuSample()
    {
        if (gpuCounterUnavailable) return;
        if ((DateTime.UtcNow - lastGpuSampleUtc).TotalMilliseconds < 900) return;
        lastGpuSampleUtc = DateTime.UtcNow;
        try
        {
            var category = new System.Diagnostics.PerformanceCounterCategory("GPU Engine");
            float total = 0f;
            foreach (string name in category.GetInstanceNames())
            {
                if (!name.EndsWith("engtype_3D", StringComparison.OrdinalIgnoreCase)) continue;
                using (var counter = new System.Diagnostics.PerformanceCounter("GPU Engine", "Utilization Percentage", name, true))
                {
                    total += counter.NextValue();
                }
            }
            perfGpu = (int)Math.Min(100f, Math.Max(0f, total));
        }
        catch
        {
            // No GPU Engine counters (older Windows / disabled): stop trying and hide the GPU value.
            gpuCounterUnavailable = true;
            perfGpu = -1;
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
            reason == "kill" ? T("highlightKill") :
            reason == "death" ? T("highlightDeath") :
            T("highlightMultikill");
        var parts = new System.Collections.Generic.List<string>();
        if (!string.IsNullOrWhiteSpace(kills)) parts.Add(kills + " kills");
        if (!string.IsNullOrWhiteSpace(place) && place != "0") parts.Add("#" + place);
        if (!string.IsNullOrWhiteSpace(damage) && damage != "0") parts.Add(damage + " dmg");
        string detail = T("highlightDetected") + label + (parts.Count > 0 ? " (" + string.Join(", ", parts.ToArray()) + ")" : "");
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
            string clip = SaveClip(reason);
            if (!string.IsNullOrEmpty(clip))
            {
                pendingGameClips.Add(clip);
                if (clipMode == "social") sessionClips.Add(clip);
                ShowToast(T("clipSaved"));
                if (overlayForm != null && overlayForm.Visible) UpdateOverlay();
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
        if (!manualReplayHotkeyRegistered || !overlayHotkeyRegistered || !actionOverlayHotkeyRegistered)
        {
            registeredHotkeyHwnd = Handle;
            if (!manualReplayHotkeyRegistered)
            {
                manualReplayHotkeyRegistered = RegisterFirstAvailable(ManualReplayHotkeyId, ManualReplayCandidates, out activeReplayHotkeyLabel);
                AddLogLine(manualReplayHotkeyRegistered ? T("manualReplayHotkeyActive") + activeReplayHotkeyLabel : T("manualReplayHotkeyTaken"));
                ApplyManualReplayHint();
                // Tell the user the active combo once, where they can act on it.
                if (manualReplayHotkeyRegistered && !replayHotkeyToastShown)
                {
                    replayHotkeyToastShown = true;
                    ShowToast(T("manualReplayHotkeyActive") + activeReplayHotkeyLabel);
                }
            }
            if (!overlayHotkeyRegistered)
            {
                overlayHotkeyRegistered = RegisterFirstAvailable(OverlayHotkeyId, OverlayHotkeyCandidates, out activeOverlayHotkeyLabel);
                if (overlayHotkeyRegistered) AddLogLine(T("overlayHotkeyActive") + activeOverlayHotkeyLabel);
                UpdateOverlayStatus();
                UpdateSidebarStatuses();
            }
            if (!actionOverlayHotkeyRegistered)
            {
                actionOverlayHotkeyRegistered = RegisterFirstAvailable(ActionOverlayHotkeyId, ActionOverlayHotkeyCandidates, out activeActionOverlayHotkeyLabel);
                if (actionOverlayHotkeyRegistered) AddLogLine(T("actionOverlayHotkeyActive") + activeActionOverlayHotkeyLabel);
                UpdateSidebarStatuses();
            }
        }
    }

    // Register the first combo the OS lets us claim; out label is the active combo (or "").
    private bool RegisterFirstAvailable(int id, ReplayHotkey[] candidates, out string label)
    {
        label = "";
        foreach (ReplayHotkey combo in candidates)
        {
            if (RegisterHotKey(registeredHotkeyHwnd, id, combo.Mods | ModNoRepeat, combo.Vk))
            {
                label = combo.Label;
                return true;
            }
        }
        return false;
    }

    protected override void OnHandleDestroyed(EventArgs e)
    {
        if (manualReplayHotkeyRegistered || overlayHotkeyRegistered || actionOverlayHotkeyRegistered)
        {
            if (manualReplayHotkeyRegistered) { try { UnregisterHotKey(registeredHotkeyHwnd, ManualReplayHotkeyId); } catch { } manualReplayHotkeyRegistered = false; }
            if (overlayHotkeyRegistered) { try { UnregisterHotKey(registeredHotkeyHwnd, OverlayHotkeyId); } catch { } overlayHotkeyRegistered = false; }
            if (actionOverlayHotkeyRegistered) { try { UnregisterHotKey(registeredHotkeyHwnd, ActionOverlayHotkeyId); } catch { } actionOverlayHotkeyRegistered = false; }
            registeredHotkeyHwnd = IntPtr.Zero;
        }
        base.OnHandleDestroyed(e);
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        // Restore the user's power plan on real exit (never on hide-to-tray).
        if (gameBoostActive) DisableGameBoost();
        base.OnFormClosed(e);
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        if (m.Msg == 0x0312 /* WM_HOTKEY */)
        {
            int id = m.WParam.ToInt32();
            if (id == ManualReplayHotkeyId) OnManualReplay();
            else if (id == OverlayHotkeyId) ToggleOverlay();
            else if (id == ActionOverlayHotkeyId) ToggleActionOverlay();
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
                pendingGameClips.Add(clip);
                if (clipMode == "social") sessionClips.Add(clip);
                ShowToast(T("manualReplaySaved"));
                if (overlayForm != null && overlayForm.Visible) UpdateOverlay();
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

    // Lightweight system perf for the overlay: CPU% from time deltas, RAM% from load,
    // GPU% from the "GPU Engine" performance counters (3D engines). FPS is still out of
    // scope: it needs game present-hooking / vendor APIs.
    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime64 { public uint Low; public uint High; }

    // Game Boost extras: toggle Windows UI effects and trim background working sets.
    private const uint SPI_GETUIEFFECTS = 0x103E;
    private const uint SPI_SETUIEFFECTS = 0x103F;
    private const uint SPIF_SENDCHANGE = 0x02;

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SystemParametersInfo(uint uiAction, uint uiParam, ref bool pvParam, uint fWinIni);

    [DllImport("psapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EmptyWorkingSet(IntPtr hProcess);

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

    private void ShowProfileMenu()
    {
        if (profileMenu == null || profilePanel == null) return;
        profileMenu.Show(profilePanel, new Point(0, -profileMenu.Height));
    }

    private void OpenProfileSettings()
    {
        ShowAppShell();
        ShowPage("settings");
        backgroundHome = LoadProfileSettingsFromSite();
    }

    private void RefreshSettingsPage()
    {
        if (settingsActivisionBox != null && !settingsActivisionBox.Focused)
        {
            settingsActivisionBox.Text = connectedName;
        }
        if (settingsPictureUrlBox != null && !settingsPictureUrlBox.Focused)
        {
            settingsPictureUrlBox.Text = profilePictureUrl;
        }
        RefreshSettingsPicturePreview();
    }

    private async Task LoadProfileSettingsFromSite()
    {
        if (string.IsNullOrWhiteSpace(deviceToken)) return;
        try
        {
            string body = await ApiGetAuth("/api/companion/profile").ConfigureAwait(false);
            string activision = JsonString(body, "activisionId");
            if (string.IsNullOrWhiteSpace(activision)) activision = JsonString(body, "publicName");
            string picture = JsonString(body, "profilePicture");
            SafeUi(delegate
            {
                if (!string.IsNullOrWhiteSpace(activision))
                {
                    connectedName = activision;
                    if (settingsActivisionBox != null) settingsActivisionBox.Text = connectedName;
                }
                profilePictureUrl = picture;
                if (settingsPictureUrlBox != null) settingsPictureUrlBox.Text = profilePictureUrl;
                SaveSession();
                RefreshProfileUi();
                RefreshSettingsPicturePreview();
            });
        }
        catch (Exception ex)
        {
            SafeUi(delegate { if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsFailed") + ex.Message; });
        }
    }

    private void RefreshSettingsPicturePreview()
    {
        if (settingsPicturePreviewBox == null) return;
        Image old = settingsPicturePreviewBox.Image;
        settingsPicturePreviewBox.Image = BuildAvatarImage(string.IsNullOrWhiteSpace(connectedName) ? "WZ" : connectedName);
        if (old != null) old.Dispose();

        string value = settingsPictureUrlBox != null ? settingsPictureUrlBox.Text.Trim() : profilePictureUrl;
        if (!string.IsNullOrWhiteSpace(value))
        {
            Task.Run(async delegate { await LoadPictureIntoBox(settingsPicturePreviewBox, value); });
        }
    }

    private void ChooseSettingsPicture()
    {
        using (var dialog = new OpenFileDialog())
        {
            dialog.Filter = "Image files|*.png;*.jpg;*.jpeg;*.webp;*.gif|All files|*.*";
            dialog.Title = T("settingsChoosePicture");
            if (dialog.ShowDialog(this) != DialogResult.OK) return;

            try
            {
                var info = new FileInfo(dialog.FileName);
                if (info.Length > 500 * 1024)
                {
                    if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsImageTooLarge");
                    return;
                }
                string ext = Path.GetExtension(dialog.FileName).ToLowerInvariant();
                string mime = ext == ".jpg" || ext == ".jpeg" ? "image/jpeg" : ext == ".webp" ? "image/webp" : ext == ".gif" ? "image/gif" : "image/png";
                string dataUrl = "data:" + mime + ";base64," + Convert.ToBase64String(File.ReadAllBytes(dialog.FileName));
                if (settingsPictureUrlBox != null) settingsPictureUrlBox.Text = dataUrl;
                RefreshSettingsPicturePreview();
            }
            catch (Exception ex)
            {
                if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsFailed") + ex.Message;
            }
        }
    }

    private async Task SaveProfileSettings()
    {
        if (string.IsNullOrWhiteSpace(deviceToken))
        {
            if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsNeedConnect");
            return;
        }

        string activision = settingsActivisionBox != null ? settingsActivisionBox.Text.Trim() : "";
        string picture = settingsPictureUrlBox != null ? settingsPictureUrlBox.Text.Trim() : "";
        if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsSaving");
        if (settingsSaveButton != null) settingsSaveButton.Enabled = false;
        try
        {
            string json = "{\"activisionId\":\"" + JsonEscape(activision) + "\",\"profilePicture\":\"" + JsonEscape(picture) + "\"}";
            string body = await ApiPutAuth("/api/companion/profile", json).ConfigureAwait(false);
            string savedName = JsonString(body, "activisionId");
            if (string.IsNullOrWhiteSpace(savedName)) savedName = JsonString(body, "publicName");
            string savedPicture = JsonString(body, "profilePicture");
            SafeUi(delegate
            {
                connectedName = string.IsNullOrWhiteSpace(savedName) ? activision : savedName;
                profilePictureUrl = savedPicture;
                SaveSession();
                RefreshConnectionUi();
                RefreshProfileUi();
                RefreshSettingsPage();
                if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsSaved");
            });
        }
        catch (Exception ex)
        {
            SafeUi(delegate { if (settingsStatusLabel != null) settingsStatusLabel.Text = T("settingsFailed") + ex.Message; });
        }
        finally
        {
            SafeUi(delegate { if (settingsSaveButton != null) settingsSaveButton.Enabled = true; });
        }
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
        ApplyFreeStatsText("", "", "", "", "", "");
        ShowWelcome();
    }

    private void RefreshProfileUi()
    {
        if (profileNameLabel == null || profilePictureBox == null) return;
        string name = string.IsNullOrWhiteSpace(connectedName) ? T("profileGuest") : connectedName;
        profileNameLabel.Text = "";
        profileNameLabel.Visible = false;
        profilePictureBox.Image = BuildAvatarImage(name);
        if (!string.IsNullOrWhiteSpace(profilePictureUrl))
        {
            Task.Run(async delegate { await LoadProfilePicture(profilePictureUrl); });
        }
    }

    private void RefreshBrandLogo()
    {
        if (brandLogoBox == null) return;
        Image oldImage = brandLogoBox.Image;
        brandLogoBox.Image = BuildBrandLogoImage();
        if (oldImage != null) oldImage.Dispose();
        if (titleLabel != null) titleLabel.Visible = brandLogoBox.Image == null;
    }

    private Image BuildBrandLogoImage()
    {
        string logoPath = ResolveBrandLogoPath();
        if (string.IsNullOrWhiteSpace(logoPath)) return null;
        Color target = themeMode == "light" ? Color.FromArgb(8, 10, 14) : Color.White;
        try
        {
            using (Bitmap source = new Bitmap(logoPath))
            {
                Bitmap output = new Bitmap(source.Width, source.Height);
                for (int y = 0; y < source.Height; y++)
                {
                    for (int x = 0; x < source.Width; x++)
                    {
                        Color pixel = source.GetPixel(x, y);
                        if (pixel.A < 18)
                        {
                            output.SetPixel(x, y, Color.Transparent);
                            continue;
                        }
                        output.SetPixel(x, y, Color.FromArgb(pixel.A, target.R, target.G, target.B));
                    }
                }
                return output;
            }
        }
        catch
        {
            return null;
        }
    }

    private string ResolveBrandLogoPath()
    {
        string[] candidates = new string[]
        {
            Path.Combine(root, "app", "wzpro-logo.png"),
            Path.Combine(root, "public", "brand", "WZ__1_-removebg-preview.png"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app", "wzpro-logo.png")
        };
        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate)) return candidate;
        }
        return "";
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
        await LoadPictureIntoBox(profilePictureBox, value);
    }

    private async Task LoadPictureIntoBox(PictureBox box, string value)
    {
        try
        {
            if (box == null || string.IsNullOrWhiteSpace(value)) return;
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
                using (Image loaded = Image.FromStream(stream))
                {
                    Image image = new Bitmap(loaded);
                if (box != null && !box.IsDisposed)
                {
                    box.BeginInvoke(new Action(delegate
                    {
                        Image old = box.Image;
                        box.Image = image;
                        if (old != null) old.Dispose();
                    }));
                }
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
        if (optimisationButton != null) optimisationButton.Text = T("optimisationAccess");
        if (restartButton != null) restartButton.Text = T("restartApp");
        if (compactButton != null) compactButton.Text = compactMode ? T("compactExit") : T("compactMode");
        if (supportButton != null) supportButton.Text = T("supportButton");
        UpdateSidebarStatuses();
        if (optimisationPageTitleLabel != null) optimisationPageTitleLabel.Text = T("optimisationPageTitle");
        if (optimisationPageDescLabel != null) optimisationPageDescLabel.Text = T("optimisationPageDesc");
        if (optimisationOverlayTitleLabel != null) optimisationOverlayTitleLabel.Text = T("optimisationOverlayTitle");
        if (optimisationOverlayDescLabel != null) optimisationOverlayDescLabel.Text = T("optimisationOverlayDesc");
        if (overlayToggleButton != null) overlayToggleButton.Text = T("optimisationOverlayBtn");
        applyingOverlayState = true;
        if (overlayGamesCheck != null) { overlayGamesCheck.Text = T("overlayToggleGames"); overlayGamesCheck.Checked = overlayShowGames; }
        if (overlayHighlightsCheck != null) { overlayHighlightsCheck.Text = T("overlayToggleHighlights"); overlayHighlightsCheck.Checked = overlayShowHighlights; }
        if (overlayMetaCheck != null) { overlayMetaCheck.Text = T("overlayToggleMeta"); overlayMetaCheck.Checked = overlayShowMeta; }
        if (overlayPerfCheck != null) { overlayPerfCheck.Text = T("overlayTogglePerf"); overlayPerfCheck.Checked = overlayShowPerf; }
        applyingOverlayState = false;
        UpdateOverlayStatus();
        if (overlayForm != null) RefreshOverlayActions();
        if (optimisationBoostTitleLabel != null) optimisationBoostTitleLabel.Text = T("optimisationBoostTitle");
        if (optimisationBoostDescLabel != null) optimisationBoostDescLabel.Text = T("optimisationBoostDesc");
        if (boostFreeRamCheck != null) { boostFreeRamCheck.Text = T("optimisationBoostFreeRam"); boostFreeRamCheck.Checked = boostFreeRam; }
        if (boostPriorityCheck != null) { boostPriorityCheck.Text = T("optimisationBoostPriority"); boostPriorityCheck.Checked = boostPriority; }
        if (boostVisualCheck != null) { boostVisualCheck.Text = T("optimisationBoostVisual"); boostVisualCheck.Checked = boostVisualEffects; }
        UpdateGameBoostStatus();
        freePageTitleLabel.Text = T("freePageTitle");
        freePageDescLabel.Text = T("freePageDesc");
        if (settingsPageTitleLabel != null) settingsPageTitleLabel.Text = T("settingsPageTitle");
        if (settingsPageDescLabel != null) settingsPageDescLabel.Text = T("settingsPageDesc");
        if (settingsActivisionLabel != null) settingsActivisionLabel.Text = T("settingsActivisionLabel");
        if (settingsPictureLabel != null) settingsPictureLabel.Text = T("settingsPictureLabel");
        if (settingsChoosePictureButton != null) settingsChoosePictureButton.Text = T("settingsChoosePicture");
        if (settingsSaveButton != null) settingsSaveButton.Text = T("settingsSave");
        if (freeStatsTitleLabel != null) freeStatsTitleLabel.Text = T("freeStatsTitle");
        if (freeStatsSummaryLabel != null && string.IsNullOrWhiteSpace(freeStatsSummaryLabel.Text)) freeStatsSummaryLabel.Text = T("freeStatsEmpty");
        premiumPageTitleLabel.Text = T("premiumPageTitle");
        premiumPageDescLabel.Text = T("premiumPageDesc");
        if (profileRestartItem != null) profileRestartItem.Text = T("restartApp");
        if (profileCompactItem != null) profileCompactItem.Text = compactMode ? T("compactExit") : T("compactMode");
        if (profileSupportItem != null) profileSupportItem.Text = T("supportButton");
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
        if (topBarPanel != null) topBarPanel.BackColor = theme.Canvas;
        if (searchBoxLabel != null)
        {
            searchBoxLabel.BackColor = theme.Surface;
            searchBoxLabel.ForeColor = theme.Muted;
        }
        if (welcomePanel != null) welcomePanel.BackColor = theme.Canvas;
        if (welcomeLoginPanel != null) welcomeLoginPanel.BackColor = theme.Surface;
        if (freeInfoCard != null) freeInfoCard.BackColor = theme.Surface;
        if (settingsInfoCard != null) settingsInfoCard.BackColor = theme.Surface;
        if (settingsProfileCard != null) settingsProfileCard.BackColor = theme.Surface;
        if (optimisationInfoCard != null) optimisationInfoCard.BackColor = theme.Surface;
        if (optimisationOverlayCard != null) optimisationOverlayCard.BackColor = theme.Surface;
        if (optimisationBoostCard != null) optimisationBoostCard.BackColor = theme.Surface;
        if (freeConnectionCard != null) freeConnectionCard.BackColor = theme.Surface;
        if (freeControlsCard != null) freeControlsCard.BackColor = theme.Surface;
        if (freeStatsCard != null) freeStatsCard.BackColor = theme.Surface;
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
        if (trainingQuizCard != null) trainingQuizCard.BackColor = theme.Surface;
        if (trainingRoutineCard != null) trainingRoutineCard.BackColor = theme.Surface;
        if (profilePanel != null) profilePanel.BackColor = theme.SurfaceAlt;
        if (profileNameLabel != null) profileNameLabel.ForeColor = theme.Ink;
        if (profilePictureBox != null) profilePictureBox.BackColor = Color.Transparent;
        if (profileMenu != null)
        {
            profileMenu.BackColor = theme.SurfaceAlt;
            profileMenu.ForeColor = theme.Ink;
        }
        RefreshBrandLogo();

        ApplyThemeToControls(Controls, theme);

        if (sidebarPanel != null) sidebarPanel.BackColor = theme.SurfaceAlt;
        if (mainPanel != null) mainPanel.BackColor = theme.Canvas;
        if (topBarPanel != null) topBarPanel.BackColor = theme.Canvas;
        if (searchBoxLabel != null)
        {
            searchBoxLabel.BackColor = theme.Surface;
            searchBoxLabel.ForeColor = theme.Muted;
        }
        if (welcomePanel != null) welcomePanel.BackColor = theme.Canvas;
        if (welcomeLoginPanel != null) welcomeLoginPanel.BackColor = theme.Surface;
        if (freeInfoCard != null) freeInfoCard.BackColor = theme.Surface;
        if (settingsInfoCard != null) settingsInfoCard.BackColor = theme.Surface;
        if (settingsProfileCard != null) settingsProfileCard.BackColor = theme.Surface;
        if (optimisationInfoCard != null) optimisationInfoCard.BackColor = theme.Surface;
        if (optimisationOverlayCard != null) optimisationOverlayCard.BackColor = theme.Surface;
        if (optimisationBoostCard != null) optimisationBoostCard.BackColor = theme.Surface;
        if (freeConnectionCard != null) freeConnectionCard.BackColor = theme.Surface;
        if (freeControlsCard != null) freeControlsCard.BackColor = theme.Surface;
        if (freeStatsCard != null) freeStatsCard.BackColor = theme.Surface;
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
        if (trainingQuizCard != null) trainingQuizCard.BackColor = theme.Surface;
        if (trainingRoutineCard != null) trainingRoutineCard.BackColor = theme.Surface;
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
        if (freeStatsTitleLabel != null) freeStatsTitleLabel.ForeColor = theme.Blue;
        if (freeStatsSummaryLabel != null) freeStatsSummaryLabel.ForeColor = theme.Ink;
        if (freeStatsDetailLabel != null) freeStatsDetailLabel.ForeColor = theme.Muted;
        if (settingsPageTitleLabel != null) settingsPageTitleLabel.ForeColor = theme.Ink;
        if (settingsPageDescLabel != null) settingsPageDescLabel.ForeColor = theme.Muted;
        if (settingsActivisionLabel != null) settingsActivisionLabel.ForeColor = theme.Blue;
        if (settingsPictureLabel != null) settingsPictureLabel.ForeColor = theme.Blue;
        if (settingsStatusLabel != null) settingsStatusLabel.ForeColor = theme.Muted;
        if (settingsPicturePreviewBox != null) settingsPicturePreviewBox.BackColor = Color.Transparent;
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
        StylePrimaryButton(settingsSaveButton, theme);
        StyleSecondaryButton(settingsChoosePictureButton, theme);
        StylePrimaryButton(overlayToggleButton, theme);
        StylePrimaryButton(gameBoostButton, theme);
        StylePrimaryButton(clipsFolderButton, theme);
        StyleSecondaryButton(clipsOpenFolderButton, theme);
        StylePrimaryButton(premiumCheckoutButton, theme);
        StyleSecondaryButton(premiumRefreshButton, theme);
        StyleSecondaryButton(themeButton, theme);
        StyleSecondaryButton(minimizeButton, theme);
        StyleSecondaryButton(closeButton, theme);
        StyleSecondaryButton(restartButton, theme);
        StyleSecondaryButton(compactButton, theme);
        StyleSecondaryButton(supportButton, theme);
        StyleComboBox(languageBox, theme);
        StyleCheckBox(highlightsToggle, theme);
        StylePageButtons(theme);
        UpdateGameBoostStatus(); // re-assert the active/inactive boost colour after the primary-button reset
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
        StylePageButton(optimisationButton, activePage == "optimisation", theme);
    }

    private void StylePageButton(Button button, bool active, WzTheme theme)
    {
        if (button == null) return;
        button.BackColor = active ? theme.Surface : theme.SurfaceAlt;
        button.ForeColor = active ? theme.Blue : theme.Ink;
        button.FlatAppearance.BorderColor = active ? theme.Blue : theme.Line;
        button.FlatAppearance.MouseOverBackColor = theme.Surface;
        button.FlatAppearance.MouseDownBackColor = theme.SurfaceAlt;
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
            if (actionOverlayForm != null && actionOverlayForm.Visible) RefreshActionOverlay();
        };
        outputTimer.Start();

        loginPollTimer = new Timer { Interval = 2200 };
        loginPollTimer.Tick += async delegate { await PollLoginFlow(); };

        Resize += delegate
        {
            if (WindowState == FormWindowState.Minimized) HideToBackground();
            else ApplyResponsiveLayout();
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
            if (actionOverlayForm != null) actionOverlayForm.Dispose();
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
            if (actionOverlayForm != null) actionOverlayForm.Dispose();
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
            int savedClipSeconds;
            if (int.TryParse(ExtractLine(text, "clipSeconds"), out savedClipSeconds)
                && (savedClipSeconds == 30 || savedClipSeconds == 15 || savedClipSeconds == 10 || savedClipSeconds == 5))
            {
                highlightClipSeconds = savedClipSeconds;
            }
            musicPath = ExtractLine(text, "music");
            systemAudioDevice = ExtractLine(text, "sysAudio");
            micAudioDevice = ExtractLine(text, "micAudio");
            string savedTrainingGoal = ExtractLine(text, "trainingGoal");
            if (savedTrainingGoal == "survive" || savedTrainingGoal == "finish" || savedTrainingGoal == "rotate" || savedTrainingGoal == "comms") trainingGoal = savedTrainingGoal;
            compactMode = ExtractLine(text, "compactMode") == "1";
            int savedX, savedY;
            // Accept any parseable coordinate; EnsureOverlay/ToggleOverlay clamp it to a
            // currently-visible screen (handles disconnected and left/above monitors).
            if (int.TryParse(ExtractLine(text, "overlayX"), out savedX)) overlayX = savedX;
            if (int.TryParse(ExtractLine(text, "overlayY"), out savedY)) overlayY = savedY;
            // Missing keys default to shown (older session files keep all lines on).
            overlayShowGames = ExtractLine(text, "overlayShowGames") != "0";
            overlayShowHighlights = ExtractLine(text, "overlayShowHighlights") != "0";
            overlayShowMeta = ExtractLine(text, "overlayShowMeta") != "0";
            overlayShowPerf = ExtractLine(text, "overlayShowPerf") != "0";
            boostFreeRam = ExtractLine(text, "boostFreeRam") != "0";
            boostPriority = ExtractLine(text, "boostPriority") != "0";
            boostVisualEffects = ExtractLine(text, "boostVisualEffects") != "0";
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
            trainingCoachResult = DecodeSessionValue(ExtractLine(text, "trainingCoachResult"));
            trainingRoutineResult = DecodeSessionValue(ExtractLine(text, "trainingRoutineResult"));
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
        if (overlayForm != null) { overlayX = overlayForm.Location.X; overlayY = overlayForm.Location.Y; }
        File.WriteAllText(sessionPath, "site=" + site + Environment.NewLine + "token=" + deviceToken + Environment.NewLine + "userName=" + connectedName + Environment.NewLine + "profilePicture=" + profilePictureUrl + Environment.NewLine + "theme=" + themeMode + Environment.NewLine + "language=" + languageCode + Environment.NewLine + "highlightsPro=" + (highlightsProEnabled ? "1" : "0") + Environment.NewLine + "clipsFolder=" + clipsFolderPath + Environment.NewLine + "clipMode=" + clipMode + Environment.NewLine + "clipSeconds=" + highlightClipSeconds + Environment.NewLine + "socialFormat=" + socialFormat + Environment.NewLine + "music=" + musicPath + Environment.NewLine + "sysAudio=" + systemAudioDevice + Environment.NewLine + "micAudio=" + micAudioDevice + Environment.NewLine + "compactMode=" + (compactMode ? "1" : "0") + Environment.NewLine + "overlayX=" + overlayX + Environment.NewLine + "overlayY=" + overlayY + Environment.NewLine + "overlayShowGames=" + (overlayShowGames ? "1" : "0") + Environment.NewLine + "overlayShowHighlights=" + (overlayShowHighlights ? "1" : "0") + Environment.NewLine + "overlayShowMeta=" + (overlayShowMeta ? "1" : "0") + Environment.NewLine + "overlayShowPerf=" + (overlayShowPerf ? "1" : "0") + Environment.NewLine + "boostFreeRam=" + (boostFreeRam ? "1" : "0") + Environment.NewLine + "boostPriority=" + (boostPriority ? "1" : "0") + Environment.NewLine + "boostVisualEffects=" + (boostVisualEffects ? "1" : "0") + Environment.NewLine + "trainingGoal=" + trainingGoal + Environment.NewLine + "trainingReview=" + TrainingReviewState() + Environment.NewLine + "trainingZones=" + TrainingZonesState() + Environment.NewLine + "trainingModule=" + trainingModuleKey + Environment.NewLine + "trainingModuleStates=" + trainingModuleStates + Environment.NewLine + "trainingModuleNotes=" + trainingModuleNotes + Environment.NewLine + "trainingCoachResult=" + EncodeSessionValue(trainingCoachResult) + Environment.NewLine + "trainingRoutineResult=" + EncodeSessionValue(trainingRoutineResult), Encoding.UTF8);
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

    private async Task<string> ApiGetAuth(string path)
    {
        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Get, site + path))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deviceToken);
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!response.IsSuccessStatusCode) throw new Exception(body);
                    return body;
                }
            }
        }
        catch (HttpRequestException ex)
        {
            string detail = ex.InnerException != null ? " Detail: " + ex.InnerException.Message : "";
            throw new Exception(T("joinFailed") + site + T("joinAdvice") + detail, ex);
        }
    }

    private async Task<string> ApiPostAuth(string path, string json)
    {
        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Post, site + path))
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deviceToken);
                request.Content = content;
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!response.IsSuccessStatusCode) throw new Exception(body);
                    return body;
                }
            }
        }
        catch (HttpRequestException ex)
        {
            string detail = ex.InnerException != null ? " Detail: " + ex.InnerException.Message : "";
            throw new Exception(T("joinFailed") + site + T("joinAdvice") + detail, ex);
        }
    }

    private async Task<string> ApiPutAuth(string path, string json)
    {
        try
        {
            using (var request = new HttpRequestMessage(HttpMethod.Put, site + path))
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deviceToken);
                request.Content = content;
                using (HttpResponseMessage response = await http.SendAsync(request).ConfigureAwait(false))
                {
                    string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (!response.IsSuccessStatusCode) throw new Exception(body);
                    return body;
                }
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
        return (value ?? "")
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\r", "\\r")
            .Replace("\n", "\\n")
            .Replace("\t", "\\t");
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

    private async Task CheckForUpdates(bool userRequested)
    {
        try
        {
            SafeUi(delegate
            {
                if (updateStatusLabel != null) updateStatusLabel.Text = userRequested ? T("updateChecking") : "";
            });
            using (HttpResponseMessage response = await http.GetAsync(site + "/api/companion/version?current=" + Uri.EscapeDataString(AppVersion)).ConfigureAwait(false))
            {
                if (!response.IsSuccessStatusCode)
                {
                    SafeUi(delegate { if (userRequested && updateStatusLabel != null) updateStatusLabel.Text = T("updateUnavailable"); });
                    return;
                }
                string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                string latest = JsonString(body, "version");
                if (string.IsNullOrWhiteSpace(latest)) latest = JsonString(body, "latestVersion");
                string url = JsonString(body, "url");
                if (string.IsNullOrWhiteSpace(url)) url = site + "/api/companion/download";
                bool newer = IsNewerVersion(latest, AppVersion);
                SafeUi(delegate
                {
                    updateAvailable = newer;
                    updateUrl = newer ? url : "";
                    if (updateStatusLabel != null) updateStatusLabel.Text = newer ? (T("updateAvailable") + latest) : T("updateCurrent");
                    if (newer)
                    {
                        ShowToast(T("updateAvailable") + latest);
                        if (tray != null) tray.ShowBalloonTip(4500, "WZPRO Companion", T("updateAvailable") + latest, ToolTipIcon.Info);
                    }
                });
            }
        }
        catch
        {
            SafeUi(delegate { if (userRequested && updateStatusLabel != null) updateStatusLabel.Text = T("updateUnavailable"); });
        }
    }

    private static bool IsNewerVersion(string latest, string current)
    {
        Version l, c;
        if (!Version.TryParse(latest, out l) || !Version.TryParse(current, out c)) return false;
        return l.CompareTo(c) > 0;
    }

    private void RestartApp()
    {
        try
        {
            string exe = Application.ExecutablePath;
            allowExit = true;
            StopCompanion();
            if (tray != null) tray.Visible = false;
            Process.Start(new ProcessStartInfo { FileName = exe, UseShellExecute = true });
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(T("restartFailed") + ex.Message, "WZPRO Companion");
        }
    }

    private void ToggleCompactMode()
    {
        compactMode = !compactMode;
        if (compactMode) activePage = "free";
        ApplyLanguage();
        ShowPage(activePage);
        SaveSession();
    }

    private void ContactSupport()
    {
        string body = "WZPRO Companion support" + Environment.NewLine
            + "Version: " + AppVersion + Environment.NewLine
            + "Site: " + site + Environment.NewLine
            + "User: " + (string.IsNullOrWhiteSpace(connectedName) ? "not connected" : connectedName) + Environment.NewLine
            + "Premium: " + (premiumAccessActive ? "active" : "inactive") + Environment.NewLine
            + "Running: " + IsRunning + Environment.NewLine
            + "Recorder: " + (recorderActive ? "active" : "idle") + Environment.NewLine
            + "Clip mode: " + clipMode + " / " + socialFormat + Environment.NewLine
            + "Clips folder: " + EffectiveClipsFolder() + Environment.NewLine
            + "Last log:" + Environment.NewLine + (logBox == null ? "" : logBox.Text);
        try { Clipboard.SetText(body); } catch { }
        ShowToast(T("supportCopied"));
        OpenUrl(site + "/contact");
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
            Arguments = Quote(engineScript)
                + " --site " + Quote(site)
                + " --token " + Quote(deviceToken)
                + " --poll_ms " + pollMs
                + " --player " + Quote(connectedName)
                + " --debug_dir " + Quote(Path.Combine(sessionDir, "debug")),
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
        pendingGameClips.Clear();
        if (captureTimer == null)
        {
            captureTimer = new Timer();
            captureTimer.Tick += delegate { NativeCaptureTick(); };
        }
        captureTimer.Interval = Math.Max(3000, (int)pollBox.Value * 1000);
        captureTimer.Start();
        SetRunningState(true);
        backgroundHome = FetchHomeData();
        backgroundStats = FetchStats();
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
        if (overlayForm != null && overlayForm.Visible) UpdateOverlay();
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
            pendingUploadedLine = line;
            historyCount++;
            sessionGameCount++;
            historyList.Items.Insert(0, BuildImportHistoryLine(line));
            ShowToast(T("statsSent"));
            RefreshTrainingUi();
            backgroundStats = FetchStats();
            if (premiumAccessActive && highlightsProEnabled)
            {
                if (pendingGameClips.Count > 0) ShowEndGameChoice(line);
                else if (clipMode == "full") ExportFullGame(line);
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

    private string BuildImportHistoryLine(string line)
    {
        int kills = ParseIntAfter(line, "kills", -1);
        Match dmgM = Regex.Match(line, "([0-9]+)\\s*damage", RegexOptions.IgnoreCase);
        Match placeM = Regex.Match(line, "place\\s*#?\\s*([0-9]+)", RegexOptions.IgnoreCase);
        string damage = dmgM.Success ? dmgM.Groups[1].Value : "-";
        string place = placeM.Success ? "#" + placeM.Groups[1].Value : "-";
        string killText = kills >= 0 ? kills.ToString() : "-";
        return DateTime.Now.ToString("HH:mm") + "  " + T("gamePrefix") + historyCount + "  |  " + killText + " K  |  " + damage + " dmg  |  " + place;
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
