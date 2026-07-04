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

[assembly: AssemblyTitle("WZPRO Companion")]
[assembly: AssemblyDescription("WZPRO desktop companion for Warzone statistics")]
[assembly: AssemblyCompany("WZPRO Meta")]
[assembly: AssemblyProduct("WZPRO Companion")]
[assembly: AssemblyCopyright("Copyright 2026 WZPRO Meta")]
[assembly: AssemblyVersion("0.1.0.0")]
[assembly: AssemblyFileVersion("0.1.0.0")]

public sealed class RoundedPanel : Panel
{
    public int Radius { get; set; }

    public RoundedPanel()
    {
        Radius = 7;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw | ControlStyles.UserPaint, true);
        BorderStyle = BorderStyle.None;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using (GraphicsPath path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), Radius))
        using (SolidBrush brush = new SolidBrush(BackColor))
        {
            e.Graphics.FillPath(brush, path);
        }
    }

    protected override void OnResize(EventArgs eventargs)
    {
        base.OnResize(eventargs);
        using (GraphicsPath path = RoundedRect(new Rectangle(0, 0, Width, Height), Radius))
        {
            Region = new Region(path);
        }
    }

    protected override void OnBackColorChanged(EventArgs e)
    {
        base.OnBackColorChanged(e);
        Invalidate();
    }

    private static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        int diameter = Math.Max(1, radius * 2);
        GraphicsPath path = new GraphicsPath();
        path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }
}

// iOS-style on/off switch used everywhere instead of square checkboxes.
// Blue track + knob right = on, grey track + knob left = off.
public sealed class ToggleSwitch : CheckBox
{
    public Color OnColor = Color.FromArgb(22, 60, 255);
    public Color OffColor = Color.FromArgb(64, 68, 78);

    private const int TrackW = 38;
    private const int TrackH = 20;
    private const int Gap = 8;

    public ToggleSwitch()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor | ControlStyles.OptimizedDoubleBuffer | ControlStyles.AllPaintingInWmPaint | ControlStyles.ResizeRedraw, true);
        Appearance = Appearance.Button;
        FlatStyle = FlatStyle.Flat;
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
        Height = 22;
        TabStop = false;
        FlatAppearance.BorderSize = 0;
    }

    protected override bool ShowFocusCues { get { return false; } }

    public override Size GetPreferredSize(Size proposedSize)
    {
        int textW = string.IsNullOrEmpty(Text) ? 0 : TextRenderer.MeasureText(Text, Font).Width + Gap;
        return new Size(TrackW + textW + 2, 22);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        Color bg = Parent != null ? Parent.BackColor : BackColor;
        using (SolidBrush clear = new SolidBrush(bg))
        {
            e.Graphics.FillRectangle(clear, ClientRectangle);
        }
        Rectangle track = new Rectangle(0, (Height - TrackH) / 2, TrackW, TrackH);
        DrawSwitch(e.Graphics, track, Checked, OnColor, OffColor);
        if (!string.IsNullOrEmpty(Text))
        {
            Size ts = TextRenderer.MeasureText(Text, Font);
            TextRenderer.DrawText(e.Graphics, Text, Font, new Point(TrackW + Gap, (Height - ts.Height) / 2), ForeColor, Color.Transparent);
        }
    }

    // Shared so plain Buttons acting as toggles can be repainted with the same switch look.
    public static void DrawSwitch(Graphics g, Rectangle r, bool on, Color onColor, Color offColor)
    {
        SmoothingMode prev = g.SmoothingMode;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        using (GraphicsPath path = Pill(r))
        using (SolidBrush track = new SolidBrush(on ? onColor : offColor))
            g.FillPath(track, path);
        int d = r.Height - 6;
        int kx = on ? r.Right - d - 3 : r.Left + 3;
        using (SolidBrush knob = new SolidBrush(Color.White))
            g.FillEllipse(knob, kx, r.Top + 3, d, d);
        g.SmoothingMode = prev;
    }

    private static GraphicsPath Pill(Rectangle b)
    {
        int d = b.Height;
        GraphicsPath p = new GraphicsPath();
        p.AddArc(b.Left, b.Top, d, d, 90, 180);
        p.AddArc(b.Right - d, b.Top, d, d, 270, 180);
        p.CloseFigure();
        return p;
    }
}

public sealed partial class WzproCompanionApp : Form
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
    private Panel settingsPictureCard;
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
    private Button importAddButton;
    private Button importOpenButton;
    private DateTime lastImportRefreshUtc = DateTime.MinValue;
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
    private Panel trainingReviewCard;
    private Panel trainingReadinessCard;
    private Panel trainingHeatmapCard;
    private Panel trainingQuizCard;
    private Panel trainingRoutineCard;
    // Training Lab cards that replaced the old "Focus de session" + category/module engine.
    private Panel trainingDeathCard;
    private Panel trainingObjectiveCard;
    private Panel trainingWarmupCard;
    private Panel trainingVodCard;
    private Panel trainingHebdoCard;
    private Button[] trainingDeathButtons = new Button[4];
    private Button trainingDeathResetButton;
    private Label trainingDeathTotalLabel;
    private int[] trainingDeathCounts = new int[4];
    private TextBox trainingObjectiveBox;
    private Button trainingObjectiveVerdictButton;
    private int trainingObjectiveVerdict;
    private string trainingObjectiveText = "";
    private Button[] trainingWarmupButtons = new Button[5];
    private Label trainingWarmupProgressLabel;
    private bool[] trainingWarmupDone = new bool[5];
    private TextBox trainingVodBox;
    private string trainingVodNotes = "";
    private Button[] trainingHebdoButtons = new Button[7];
    private Label trainingHebdoProgressLabel;
    private bool[] trainingHebdoDone = new bool[7];
    private bool updatingTrainingCardsUi;
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
    private Button settingsButton;
    private Label premiumSidebarLabel;
    private Label recorderSidebarLabel;
    private Label overlayHotkeySidebarLabel;
    private Label actionOverlayHotkeySidebarLabel;
    private Label updateStatusLabel;
    private Button restartButton;
    private Button compactButton;
    private Button supportButton;
    private Label versionLabel;
    private ToolTip sidebarToolTip;
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
    private Button optimisationAllButton;
    private Panel boostFreeRamCard;
    private Panel boostPriorityCard;
    private Panel boostVisualCard;
    private Label boostFreeRamTitleLabel;
    private Label boostFreeRamDescLabel;
    private Label boostPriorityTitleLabel;
    private Label boostPriorityDescLabel;
    private Label boostVisualTitleLabel;
    private Label boostVisualDescLabel;
    private Button boostFreeRamButton;
    private Button boostPriorityButton;
    private Button boostVisualButton;
    private bool gameBoostActive;
    private bool boostBusy; // guards the async powercfg work so the UI never freezes
    // Advanced optimisations (admin, reversible). State lives in the OS; backups let us undo.
    private Panel optimisationTweaksPanel;
    private string tweakBackups = "";       // id -> original value, for revert
    private string ultimateSchemeGuid = ""; // GUID of the duplicated Ultimate Performance plan
    private readonly System.Collections.Generic.Dictionary<string, bool> tweakOn = new System.Collections.Generic.Dictionary<string, bool>();
    private readonly System.Collections.Generic.Dictionary<string, Button> tweakButtons = new System.Collections.Generic.Dictionary<string, Button>();
    private readonly System.Collections.Generic.Dictionary<string, Panel> tweakCards = new System.Collections.Generic.Dictionary<string, Panel>();
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
    private Button trainingZoneAButton;
    private Button trainingZoneBButton;
    private Button trainingZoneCButton;
    private Button trainingZoneDButton;
    private Button trainingResetButton;
    private Button trainingQuizAnalyzeButton;
    private Button trainingRoutineButton;
    private CheckBox highlightsToggle;
    private CheckBox trainingDropCheck;
    private CheckBox trainingRotateCheck;
    private CheckBox trainingPushCheck;
    private CheckBox trainingRegainCheck;
    private CheckBox trainingTiltCheck;
    private ComboBox languageBox;
    private ComboBox welcomeLanguageBox;
    private NumericUpDown pollBox;
    private ComboBox monitorBox;
    private Label monitorLabel;
    private int captureMonitorIndex = -1; // -1 = auto (active game window)
    private bool updatingMonitorUi;
    private bool blackFrameWarned;
    private int displayCaptureMode; // 0 = unknown/probing, 1 = ddagrab (display capture), 2 = GDI fallback
    private volatile bool displayCaptureBusy;
    private ListBox historyList;
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
    private bool pollingLogin;
    private bool allowExit;
    private bool minimizeNoticeShown;
    private bool premiumAccessActive;
    private bool premiumCheckRunning;
    private DateTime lastPremiumCheckUtc = DateTime.MinValue;
    private Task backgroundPremiumCheck;
    private Task backgroundHome;
    private Task backgroundProfile;
    private Task backgroundStats;
    private Task backgroundUpdateCheck;
    private bool updateAvailable;
    private string updateUrl = "";
    private bool compactMode;
    private int historyCount;

    [STAThread]
    public static void Main(string[] args)
    {
        EnableDpiAwareness();
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
            backgroundProfile = LoadProfileSettingsFromSite();
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
        Size = new Size(1280, 720);
        MinimumSize = new Size(1180, 680);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        DoubleBuffered = true;
        Font = AppFont(9, FontStyle.Regular);

        welcomePanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(1280, 720),
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

        sidebarToolTip = new ToolTip();
        sidebarToolTip.AutoPopDelay = 5000;
        sidebarToolTip.InitialDelay = 250;
        sidebarToolTip.ReshowDelay = 100;

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

        settingsButton = Button("", 16, 304, 188, 44, Color.FromArgb(42, 42, 48));
        settingsButton.Click += delegate { ShowPage("settings"); };
        sidebarPanel.Controls.Add(settingsButton);

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

        versionLabel = Label("v" + AppVersion, 8, 58, 172, 20, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        versionLabel.TextAlign = ContentAlignment.TopCenter;
        profilePanel.Controls.Add(versionLabel);

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
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
        };
        mainPanel.Controls.Add(freeInfoCard);

        freePageTitleLabel = Label("", 24, 22, 420, 32, 16, FontStyle.Bold, Color.White);
        freeInfoCard.Controls.Add(freePageTitleLabel);

        freePageDescLabel = Label("", 24, 18, 520, 36, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        freeInfoCard.Controls.Add(freePageDescLabel);

        metaTodayLabel = Label("", 24, 100, 640, 20, 9, FontStyle.Bold, Color.FromArgb(120, 150, 255));
        metaTodayLabel.Visible = false;
        freeInfoCard.Controls.Add(metaTodayLabel);

        freeConnectionCard = new RoundedPanel
        {
            Location = new Point(34, 238),
            Size = new Size(690, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
        };
        mainPanel.Controls.Add(freeConnectionCard);
        freePageDescLabel.Parent = freeConnectionCard;

        statusLabel = Label("", 24, 18, 260, 24, 10, FontStyle.Bold, Color.FromArgb(185, 185, 185));
        freeConnectionCard.Controls.Add(statusLabel);

        connectionLabel = Label("", 24, 58, 360, 24, 9, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        freeConnectionCard.Controls.Add(connectionLabel);

        connectButton = Button("", 440, 34, 220, 38, Color.FromArgb(22, 60, 255));
        connectButton.Click += async delegate { await StartLoginFlow(); };
        freeConnectionCard.Controls.Add(connectButton);

        freeControlsCard = new RoundedPanel
        {
            Location = new Point(34, 364),
            Size = new Size(690, 140),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
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

        monitorLabel = Label("", 24, 46, 120, 20, 8, FontStyle.Regular, Color.White);
        freeControlsCard.Controls.Add(monitorLabel);
        monitorBox = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Location = new Point(154, 44),
            Size = new Size(300, 24),
            BackColor = Color.FromArgb(14, 18, 45),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Regular)
        };
        monitorBox.SelectedIndexChanged += delegate { OnMonitorSelected(); };
        freeControlsCard.Controls.Add(monitorBox);

        startButton = Button("", 470, 14, 82, 34, Color.FromArgb(22, 60, 255));
        startButton.Click += delegate { StartCompanion(); };
        freeControlsCard.Controls.Add(startButton);

        stopButton = Button("", 566, 14, 82, 34, Color.FromArgb(42, 42, 48));
        stopButton.Enabled = false;
        stopButton.Click += delegate { StopCompanion(); };
        freeControlsCard.Controls.Add(stopButton);

        hintLabel = Label("", 24, 66, 620, 34, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        freeControlsCard.Controls.Add(hintLabel);

        freeStatsCard = new RoundedPanel
        {
            Location = new Point(34, 496),
            Size = new Size(690, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
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
            Visible = false
        };
        mainPanel.Controls.Add(settingsInfoCard);

        settingsPageTitleLabel = Label("", 24, 22, 420, 32, 16, FontStyle.Bold, Color.White);
        settingsInfoCard.Controls.Add(settingsPageTitleLabel);

        settingsPageDescLabel = Label("", 24, 62, 620, 40, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        settingsInfoCard.Controls.Add(settingsPageDescLabel);

        settingsProfileCard = new RoundedPanel
        {
            Location = new Point(34, 224),
            Size = new Size(690, 118),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
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
            BorderStyle = BorderStyle.None
        };
        settingsProfileCard.Controls.Add(settingsActivisionBox);

        settingsSaveButton = Button("", 574, 48, 92, 30, Color.FromArgb(22, 60, 255));
        settingsSaveButton.Click += async delegate { await SaveProfileSettings(); };
        settingsProfileCard.Controls.Add(settingsSaveButton);

        settingsPictureCard = new RoundedPanel
        {
            Location = new Point(34, 360),
            Size = new Size(690, 154),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            Visible = false
        };
        mainPanel.Controls.Add(settingsPictureCard);

        settingsPictureLabel = Label("", 24, 94, 250, 22, 9, FontStyle.Bold, Color.White);
        settingsPictureCard.Controls.Add(settingsPictureLabel);

        settingsPicturePreviewBox = new PictureBox
        {
            Location = new Point(24, 124),
            Size = new Size(58, 58),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent
        };
        settingsPictureCard.Controls.Add(settingsPicturePreviewBox);

        settingsPictureUrlBox = new TextBox
        {
            Location = new Point(96, 128),
            Size = new Size(340, 24),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.None
        };
        settingsPictureCard.Controls.Add(settingsPictureUrlBox);

        settingsChoosePictureButton = Button("", 450, 126, 108, 28, Color.FromArgb(42, 42, 48));
        settingsChoosePictureButton.Click += delegate { ChooseSettingsPicture(); };
        settingsPictureCard.Controls.Add(settingsChoosePictureButton);

        settingsStatusLabel = Label("", 96, 164, 570, 48, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        settingsPictureCard.Controls.Add(settingsStatusLabel);

        premiumInfoCard = new Panel
        {
            Location = new Point(34, 92),
            Size = new Size(690, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
        };
        mainPanel.Controls.Add(premiumInfoCard);

        premiumPageTitleLabel = Label("", 24, 20, 420, 32, 16, FontStyle.Bold, Color.White);
        premiumInfoCard.Controls.Add(premiumPageTitleLabel);

        premiumPageDescLabel = Label("", 24, 58, 620, 36, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        premiumInfoCard.Controls.Add(premiumPageDescLabel);

        premiumHighlightsCard = new RoundedPanel
        {
            Location = new Point(34, 218),
            Size = new Size(690, 126),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
        };
        mainPanel.Controls.Add(premiumHighlightsCard);

        highlightsTitleLabel = Label("", 24, 18, 210, 22, 10, FontStyle.Bold, Color.White);
        premiumHighlightsCard.Controls.Add(highlightsTitleLabel);

        highlightsToggle = new ToggleSwitch
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

        premiumClipsCard = new RoundedPanel
        {
            Location = new Point(34, 360),
            Size = new Size(690, 94),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            Visible = false
        };
        mainPanel.Controls.Add(premiumClipsCard);

        clipsFolderTitleLabel = Label("", 24, 16, 260, 22, 10, FontStyle.Bold, Color.White);
        premiumHighlightsCard.Controls.Add(clipsFolderTitleLabel);

        clipsFolderValueLabel = Label("", 24, 46, 444, 36, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        premiumHighlightsCard.Controls.Add(clipsFolderValueLabel);

        clipsFolderButton = Button("", 500, 42, 82, 34, Color.FromArgb(22, 60, 255));
        clipsFolderButton.Click += delegate { ChooseClipsFolder(); };
        premiumHighlightsCard.Controls.Add(clipsFolderButton);

        clipsOpenFolderButton = Button("", 592, 42, 74, 34, Color.FromArgb(42, 42, 48));
        clipsOpenFolderButton.Click += delegate { OpenClipsFolder(); };
        premiumHighlightsCard.Controls.Add(clipsOpenFolderButton);

        premiumAccessCard = new RoundedPanel
        {
            Location = new Point(34, 470),
            Size = new Size(690, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
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

        premiumAdvancedCard = new RoundedPanel
        {
            Location = new Point(34, 586),
            Size = new Size(690, 124),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
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
            BorderStyle = BorderStyle.None
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
        };
        mainPanel.Controls.Add(trainingInfoCard);

        var trainingPageTitleLabel = Label("", 24, 18, 430, 30, 16, FontStyle.Bold, Color.White);
        trainingPageTitleLabel.Name = "trainingPageTitleLabel";
        trainingInfoCard.Controls.Add(trainingPageTitleLabel);

        var trainingPageDescLabel = Label("", 24, 54, 620, 28, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        trainingPageDescLabel.Name = "trainingPageDescLabel";
        trainingInfoCard.Controls.Add(trainingPageDescLabel);

        // Card 1 - Death log (Analyse des morts)
        trainingDeathCard = new RoundedPanel
        {
            Location = new Point(34, 198),
            Size = new Size(330, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
        };
        mainPanel.Controls.Add(trainingDeathCard);
        var trainingDeathTitleLabel = Label("", 16, 10, 170, 18, 9, FontStyle.Bold, Color.White);
        trainingDeathTitleLabel.Name = "trainingDeathTitle";
        trainingDeathCard.Controls.Add(trainingDeathTitleLabel);
        trainingDeathResetButton = Button("", 258, 8, 60, 22, Color.FromArgb(42, 42, 48));
        trainingDeathResetButton.Click += delegate { ResetTrainingDeaths(); };
        trainingDeathCard.Controls.Add(trainingDeathResetButton);
        for (int i = 0; i < trainingDeathButtons.Length; i++)
        {
            int idx = i;
            trainingDeathButtons[i] = Button("", 16 + i * 74, 34, 70, 26, Color.FromArgb(42, 42, 48));
            trainingDeathButtons[i].Click += delegate { OnTrainingDeathClick(idx); };
            trainingDeathCard.Controls.Add(trainingDeathButtons[i]);
        }
        trainingDeathTotalLabel = Label("", 16, 66, 298, 16, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        trainingDeathCard.Controls.Add(trainingDeathTotalLabel);

        // Card 2 - Objectifs de session
        trainingObjectiveCard = new RoundedPanel
        {
            Location = new Point(388, 198),
            Size = new Size(336, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
        };
        mainPanel.Controls.Add(trainingObjectiveCard);
        var trainingObjectiveTitleLabel = Label("", 16, 10, 190, 18, 9, FontStyle.Bold, Color.White);
        trainingObjectiveTitleLabel.Name = "trainingObjectiveTitle";
        trainingObjectiveCard.Controls.Add(trainingObjectiveTitleLabel);
        trainingObjectiveVerdictButton = Button("", 206, 8, 114, 22, Color.FromArgb(42, 42, 48));
        trainingObjectiveVerdictButton.Click += delegate { CycleTrainingObjectiveVerdict(); };
        trainingObjectiveCard.Controls.Add(trainingObjectiveVerdictButton);
        trainingObjectiveBox = new TextBox
        {
            Location = new Point(16, 38),
            Size = new Size(304, 24),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.None,
            Font = AppFont(8, FontStyle.Regular)
        };
        trainingObjectiveBox.TextChanged += delegate
        {
            if (updatingTrainingCardsUi) return;
            trainingObjectiveText = trainingObjectiveBox.Text;
            SaveSession();
        };
        trainingObjectiveCard.Controls.Add(trainingObjectiveBox);

        // Card 3 - Warmup pre-game
        trainingWarmupCard = new RoundedPanel
        {
            Location = new Point(34, 300),
            Size = new Size(330, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
        };
        mainPanel.Controls.Add(trainingWarmupCard);
        var trainingWarmupTitleLabel = Label("", 16, 10, 170, 18, 9, FontStyle.Bold, Color.White);
        trainingWarmupTitleLabel.Name = "trainingWarmupTitle";
        trainingWarmupCard.Controls.Add(trainingWarmupTitleLabel);
        trainingWarmupProgressLabel = Label("", 254, 10, 64, 18, 9, FontStyle.Bold, Color.FromArgb(120, 150, 255));
        trainingWarmupProgressLabel.TextAlign = ContentAlignment.MiddleRight;
        trainingWarmupCard.Controls.Add(trainingWarmupProgressLabel);
        for (int i = 0; i < trainingWarmupButtons.Length; i++)
        {
            int idx = i;
            trainingWarmupButtons[i] = Button("", 16 + i * 60, 38, 56, 28, Color.FromArgb(42, 42, 48));
            trainingWarmupButtons[i].Click += delegate { ToggleTrainingWarmup(idx); };
            trainingWarmupCard.Controls.Add(trainingWarmupButtons[i]);
        }

        // Card 4 - VOD notes
        trainingVodCard = new RoundedPanel
        {
            Location = new Point(388, 300),
            Size = new Size(336, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
        };
        mainPanel.Controls.Add(trainingVodCard);
        var trainingVodTitleLabel = Label("", 16, 10, 300, 18, 9, FontStyle.Bold, Color.White);
        trainingVodTitleLabel.Name = "trainingVodTitle";
        trainingVodCard.Controls.Add(trainingVodTitleLabel);
        trainingVodBox = new TextBox
        {
            Location = new Point(16, 34),
            Size = new Size(304, 46),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.None,
            Font = AppFont(8, FontStyle.Regular)
        };
        trainingVodBox.TextChanged += delegate
        {
            if (updatingTrainingCardsUi) return;
            trainingVodNotes = trainingVodBox.Text;
            SaveSession();
        };
        trainingVodCard.Controls.Add(trainingVodBox);

        // Card 5 - Suivi hebdo
        trainingHebdoCard = new RoundedPanel
        {
            Location = new Point(34, 402),
            Size = new Size(690, 92),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
        };
        mainPanel.Controls.Add(trainingHebdoCard);
        var trainingHebdoTitleLabel = Label("", 16, 10, 220, 18, 9, FontStyle.Bold, Color.White);
        trainingHebdoTitleLabel.Name = "trainingHebdoTitle";
        trainingHebdoCard.Controls.Add(trainingHebdoTitleLabel);
        trainingHebdoProgressLabel = Label("", 580, 10, 94, 18, 9, FontStyle.Bold, Color.FromArgb(120, 150, 255));
        trainingHebdoProgressLabel.TextAlign = ContentAlignment.MiddleRight;
        trainingHebdoCard.Controls.Add(trainingHebdoProgressLabel);
        for (int i = 0; i < trainingHebdoButtons.Length; i++)
        {
            int idx = i;
            trainingHebdoButtons[i] = Button("", 16 + i * 94, 38, 90, 28, Color.FromArgb(42, 42, 48));
            trainingHebdoButtons[i].Click += delegate { ToggleTrainingHebdo(idx); };
            trainingHebdoCard.Controls.Add(trainingHebdoButtons[i]);
        }

        trainingQuizCard = new RoundedPanel
        {
            Location = new Point(34, 516),
            Size = new Size(330, 180),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
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

        trainingRoutineCard = new RoundedPanel
        {
            Location = new Point(388, 516),
            Size = new Size(336, 180),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
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
            BorderStyle = BorderStyle.None,
            Font = AppFont(8, FontStyle.Regular)
        };
        trainingRoutineCard.Controls.Add(trainingRoutineResultBox);

        trainingReviewCard = new RoundedPanel
        {
            Location = new Point(34, 340),
            Size = new Size(330, 160),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
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

        trainingReadinessCard = new RoundedPanel
        {
            Location = new Point(388, 340),
            Size = new Size(336, 160),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
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

        trainingHeatmapCard = new RoundedPanel
        {
            Location = new Point(34, 516),
            Size = new Size(690, 124),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
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
        importAddButton = Button("", 180, 486, 86, 28, Color.FromArgb(22, 60, 255));
        importAddButton.Click += delegate { AddManualScoreboardCapture(); };
        mainPanel.Controls.Add(importAddButton);
        importOpenButton = Button("", 274, 486, 86, 28, Color.FromArgb(42, 42, 48));
        importOpenButton.Click += delegate { OpenSelectedScoreboardCapture(); };
        mainPanel.Controls.Add(importOpenButton);
        historyList = new ListBox
        {
            Location = new Point(34, 516),
            Size = new Size(330, 56),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.None
        };
        historyList.DoubleClick += delegate { OpenSelectedScoreboardCapture(); };
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
            BorderStyle = BorderStyle.None
        };
        mainPanel.Controls.Add(logBox);

        // ── Optimisation page ──
        optimisationInfoCard = new Panel
        {
            Location = new Point(34, 26),
            Size = new Size(690, 84),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationInfoCard);
        optimisationPageTitleLabel = Label("", 24, 16, 440, 30, 16, FontStyle.Bold, Color.White);
        optimisationInfoCard.Controls.Add(optimisationPageTitleLabel);
        optimisationPageDescLabel = Label("", 24, 50, 640, 24, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        optimisationInfoCard.Controls.Add(optimisationPageDescLabel);
        optimisationAllButton = Button("", 520, 22, 150, 34, Color.FromArgb(22, 60, 255));
        optimisationAllButton.TextAlign = ContentAlignment.MiddleCenter;
        optimisationAllButton.Padding = Padding.Empty;
        optimisationAllButton.Click += delegate { EnableAllOptimisations(); };
        mainPanel.Controls.Add(optimisationAllButton);

        optimisationOverlayCard = new RoundedPanel
        {
            Location = new Point(34, 122),
            Size = new Size(690, 120),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationOverlayCard);
        optimisationOverlayTitleLabel = Label("", 24, 16, 440, 24, 11, FontStyle.Bold, Color.White);
        optimisationOverlayCard.Controls.Add(optimisationOverlayTitleLabel);
        optimisationOverlayDescLabel = Label("", 24, 52, 480, 44, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        optimisationOverlayCard.Controls.Add(optimisationOverlayDescLabel);
        overlayToggleButton = Button("", 520, 16, 90, 30, Color.FromArgb(22, 60, 255));
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

        optimisationBoostCard = new RoundedPanel
        {
            Location = new Point(34, 266),
            Size = new Size(690, 156),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationBoostCard);
        optimisationBoostTitleLabel = Label("", 24, 16, 440, 24, 11, FontStyle.Bold, Color.White);
        optimisationBoostCard.Controls.Add(optimisationBoostTitleLabel);
        optimisationBoostDescLabel = Label("", 24, 52, 480, 44, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        optimisationBoostCard.Controls.Add(optimisationBoostDescLabel);
        gameBoostButton = Button("", 520, 16, 90, 30, Color.FromArgb(22, 60, 255));
        gameBoostButton.Click += delegate { ToggleGameBoost(); };
        optimisationBoostCard.Controls.Add(gameBoostButton);
        boostFreeRamCheck = BoostOptionCheck(24, 92, boostFreeRam);
        boostFreeRamCheck.CheckedChanged += delegate { boostFreeRam = boostFreeRamCheck.Checked; SaveSession(); };
        boostFreeRamCheck.Visible = false;
        boostPriorityCheck = BoostOptionCheck(200, 92, boostPriority);
        boostPriorityCheck.CheckedChanged += delegate { boostPriority = boostPriorityCheck.Checked; SaveSession(); };
        boostPriorityCheck.Visible = false;
        boostVisualCheck = BoostOptionCheck(380, 92, boostVisualEffects);
        boostVisualCheck.CheckedChanged += delegate { boostVisualEffects = boostVisualCheck.Checked; SaveSession(); };
        boostVisualCheck.Visible = false;
        optimisationBoostStatusLabel = Label("", 24, 122, 480, 20, 8, FontStyle.Bold, Color.FromArgb(150, 150, 155));
        optimisationBoostCard.Controls.Add(optimisationBoostStatusLabel);

        boostFreeRamCard = new RoundedPanel { Visible = false };
        mainPanel.Controls.Add(boostFreeRamCard);
        boostFreeRamTitleLabel = Label("", 24, 16, 360, 24, 11, FontStyle.Bold, Color.White);
        boostFreeRamCard.Controls.Add(boostFreeRamTitleLabel);
        boostFreeRamDescLabel = Label("", 24, 52, 420, 54, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        boostFreeRamCard.Controls.Add(boostFreeRamDescLabel);
        boostFreeRamButton = Button("", 520, 16, 90, 30, Color.FromArgb(42, 42, 48));
        boostFreeRamButton.Click += delegate { boostFreeRam = !boostFreeRam; OnBoostOptionChanged("ram"); };
        boostFreeRamCard.Controls.Add(boostFreeRamButton);

        boostPriorityCard = new RoundedPanel { Visible = false };
        mainPanel.Controls.Add(boostPriorityCard);
        boostPriorityTitleLabel = Label("", 24, 16, 360, 24, 11, FontStyle.Bold, Color.White);
        boostPriorityCard.Controls.Add(boostPriorityTitleLabel);
        boostPriorityDescLabel = Label("", 24, 52, 420, 54, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        boostPriorityCard.Controls.Add(boostPriorityDescLabel);
        boostPriorityButton = Button("", 520, 16, 90, 30, Color.FromArgb(42, 42, 48));
        boostPriorityButton.Click += delegate { boostPriority = !boostPriority; OnBoostOptionChanged("priority"); };
        boostPriorityCard.Controls.Add(boostPriorityButton);

        boostVisualCard = new RoundedPanel { Visible = false };
        mainPanel.Controls.Add(boostVisualCard);
        boostVisualTitleLabel = Label("", 24, 16, 360, 24, 11, FontStyle.Bold, Color.White);
        boostVisualCard.Controls.Add(boostVisualTitleLabel);
        boostVisualDescLabel = Label("", 24, 52, 420, 54, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        boostVisualCard.Controls.Add(boostVisualDescLabel);
        boostVisualButton = Button("", 520, 16, 90, 30, Color.FromArgb(42, 42, 48));
        boostVisualButton.Click += delegate { boostVisualEffects = !boostVisualEffects; OnBoostOptionChanged("visual"); };
        boostVisualCard.Controls.Add(boostVisualButton);

        // Advanced optimisations: scrollable grid of reversible system tweaks.
        optimisationTweaksPanel = new Panel
        {
            Location = new Point(34, 432),
            Size = new Size(690, 200),
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right,
            AutoScroll = true,
            BorderStyle = BorderStyle.None,
            Visible = false
        };
        mainPanel.Controls.Add(optimisationTweaksPanel);
        // Move the existing optimisation cards into the scrollable panel so the whole page
        // scrolls as one, then append the advanced tweak cards below them.
        foreach (Panel existing in new[] { optimisationOverlayCard, optimisationBoostCard, boostFreeRamCard, boostPriorityCard, boostVisualCard })
        {
            if (existing == null) continue;
            optimisationTweaksPanel.Controls.Add(existing); // re-parents from mainPanel
            existing.Anchor = AnchorStyles.Top | AnchorStyles.Left;
        }
        var tweaksTitleLabel = Label("", 4, 4, 400, 22, 11, FontStyle.Bold, Color.White);
        tweaksTitleLabel.Name = "tweaksTitle";
        optimisationTweaksPanel.Controls.Add(tweaksTitleLabel);
        var tweaksWarningLabel = Label("", 4, 28, 660, 36, 8, FontStyle.Bold, Color.FromArgb(255, 176, 32));
        tweaksWarningLabel.Name = "tweaksWarning";
        optimisationTweaksPanel.Controls.Add(tweaksWarningLabel);
        foreach (string id in TweakIds)
        {
            string tid = id;
            // Same look as the existing optimisation cards: 178px tall, title at y70,
            // desc at y102, and an iOS-style switch (SetOptionButton) top-right.
            RoundedPanel card = new RoundedPanel { Size = new Size(330, 178) };
            optimisationTweaksPanel.Controls.Add(card);
            Label title = Label("", 24, 70, 280, 24, 11, FontStyle.Bold, Color.White);
            title.Name = "tweakTitle_" + tid;
            card.Controls.Add(title);
            Label desc = Label("", 24, 102, 290, 40, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
            desc.Name = "tweakDesc_" + tid;
            card.Controls.Add(desc);
            Button toggle = Button("", 240, 24, 80, 28, Color.FromArgb(22, 60, 255));
            toggle.Click += delegate { ToggleTweak(tid); };
            card.Controls.Add(toggle);
            tweakCards[tid] = card;
            tweakButtons[tid] = toggle;
        }
    }

    private CheckBox BoostOptionCheck(int x, int y, bool initial)
    {
        CheckBox cb = new ToggleSwitch
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
            Font = AppFont(8, FontStyle.Bold),
            Cursor = Cursors.Hand
        };
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.BorderColor = color;
        button.FlatAppearance.MouseOverBackColor = color;
        button.FlatAppearance.MouseDownBackColor = ControlPaint.Dark(color);
        return button;
    }

    private void ApplySidebarIcons()
    {
        SetSidebarIcon(freeAccessButton, "\u2302", T("freeAccess"));
        SetSidebarIcon(premiumButton, "\u25C6", T("premiumAccess"));
        SetSidebarIcon(trainingButton, "\u25A6", T("trainingAccess"));
        SetSidebarIcon(optimisationButton, "\u26A1", T("optimisationAccess"));
        SetSidebarIcon(settingsButton, "\u2699", T("settingsPageTitle"));
        if (versionLabel != null) versionLabel.Text = "v" + AppVersion;
    }

    private void SetSidebarIcon(Button button, string icon, string tooltip)
    {
        if (button == null) return;
        button.Text = icon;
        button.TextAlign = ContentAlignment.MiddleCenter;
        button.Font = new Font("Segoe UI Symbol", 15, FontStyle.Bold);
        button.FlatAppearance.BorderSize = 0;
        if (sidebarToolTip != null) sidebarToolTip.SetToolTip(button, tooltip);
    }

    private CheckBox TrainingCheckBox(int x, int y)
    {
        var checkBox = new ToggleSwitch
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
            if (updatingTrainingCardsUi) return;
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
                case "optimisationPageDesc": return "Enable each optimisation separately, or turn everything on at once.";
                case "optimisationAll": return "Enable all optimisations";
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
                case "optimisationBoostFreeRamDesc": return "Trims background working sets once so the game starts with more available memory.";
                case "optimisationBoostPriority": return "Warzone high priority";
                case "optimisationBoostPriorityDesc": return "Raises the running Warzone process priority while Game Boost is enabled.";
                case "optimisationBoostVisual": return "Cut visual effects";
                case "optimisationBoostVisualDesc": return "Disables Windows UI effects during the session, then restores them when boost turns off.";
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
                case "trainingPageDesc": return "Log your deaths, set your goals, run your warmup and keep the week's progress in sight.";
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
                case "captureMonitor": return "Screen";
                case "captureMonitorAuto": return "Auto (active window)";
                case "captureBlackHint": return "Black capture detected: set Warzone to Windowed / Borderless (exclusive fullscreen cannot be captured).";
                case "scoreboardSeen": return "Scoreboard detected, capturing...";
                case "endGameSeen": return "End of game seen - scoreboard captured & uploaded:";
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
                case "importAdd": return "ADD";
                case "importOpen": return "OPEN";
                case "importEmpty": return "No scoreboard capture today";
                case "manualImportAdded": return "Manual scoreboard capture added.";
                case "manualImportFailed": return "Manual capture import failed: ";
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
                case "optimisationPageDesc": return "Activa cada optimizacion por separado o activa todo de una vez.";
                case "optimisationAll": return "Activar todas";
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
                case "optimisationBoostFreeRamDesc": return "Recorta memoria de procesos en segundo plano para dejar mas RAM disponible al juego.";
                case "optimisationBoostPriority": return "Warzone prioridad alta";
                case "optimisationBoostPriorityDesc": return "Sube la prioridad del proceso Warzone mientras Game Boost esta activo.";
                case "optimisationBoostVisual": return "Cortar efectos visuales";
                case "optimisationBoostVisualDesc": return "Desactiva efectos visuales de Windows durante la sesion y los restaura despues.";
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
                case "trainingPageDesc": return "Registra tus muertes, fija objetivos, haz tu calentamiento y manten el seguimiento semanal a la vista.";
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
                case "captureMonitor": return "Pantalla";
                case "captureMonitorAuto": return "Auto (ventana activa)";
                case "captureBlackHint": return "Captura en negro: pon Warzone en modo Ventana / Borderless (la pantalla completa exclusiva no se puede capturar).";
                case "scoreboardSeen": return "Scoreboard detectado, capturando...";
                case "endGameSeen": return "Fin de partida vista - scoreboard capturado y enviado:";
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
                case "importAdd": return "ANADIR";
                case "importOpen": return "ABRIR";
                case "importEmpty": return "Sin capturas de marcador hoy";
                case "manualImportAdded": return "Captura manual de marcador anadida.";
                case "manualImportFailed": return "Error al importar la captura: ";
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
            case "optimisationPageDesc": return "Active chaque optimisation separement, ou active tout d un coup.";
            case "optimisationAll": return "Activer toutes les optimisations";
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
            case "optimisationBoostFreeRamDesc": return "Nettoie la memoire des processus en arriere-plan pour laisser plus de RAM au jeu.";
            case "optimisationBoostPriority": return "Warzone priorite haute";
            case "optimisationBoostPriorityDesc": return "Passe le processus Warzone en priorite haute pendant que Game Boost est actif.";
            case "optimisationBoostVisual": return "Couper effets visuels";
            case "optimisationBoostVisualDesc": return "Desactive les effets visuels Windows pendant la session puis les restaure ensuite.";
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
            case "trainingPageDesc": return "Logue tes morts, fixe tes objectifs, fais ton warmup et garde le suivi de la semaine sous les yeux.";
            case "trainingDeathTitle": return "Analyse des morts";
            case "trainingDeathTotal": return "morts cette session";
            case "trainingDeathRotation": return "Rotation";
            case "trainingDeathCover": return "Sans cover";
            case "trainingDeathPush": return "Push solo";
            case "trainingDeathZone": return "Zone / gaz";
            case "trainingObjectiveTitle": return "Objectif de session";
            case "trainingObjectiveHint": return "Note l objectif a tenir, puis donne le verdict apres la session.";
            case "trainingObjectiveNone": return "VERDICT";
            case "trainingObjectiveDone": return "REUSSI";
            case "trainingObjectiveRedo": return "A REFAIRE";
            case "trainingWarmupTitle": return "Warmup pre-game";
            case "trainingWarmupAim": return "Aim";
            case "trainingWarmupTilt": return "Anti-tilt";
            case "trainingWarmupRecoil": return "Recoil";
            case "trainingWarmupRegain": return "Regain";
            case "trainingWarmupMental": return "Mental";
            case "trainingVodTitle": return "VOD notes";
            case "trainingHebdoTitle": return "Suivi hebdo";
            case "trainingHebdoDays": return "jours";
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
            case "captureMonitor": return "Ecran";
            case "captureMonitorAuto": return "Auto (fenetre active)";
            case "captureBlackHint": return "Capture noire detectee : mets Warzone en mode Fenetre / Borderless (le plein ecran exclusif ne peut pas etre capture).";
            case "scoreboardSeen": return "Scoreboard detecte, capture en cours...";
            case "endGameSeen": return "Fin de game vue - scoreboard capture et envoye :";
            case "tweaksSectionTitle": return "Optimisations avancees (admin)";
            case "tweaksWarning": return "Attention : activer tous les reglages d un coup peut causer des instabilites selon ta config. Active-les un par un et teste en jeu ; en cas de souci, redesactive le dernier.";
            case "tweakOn": return "ACTIVE";
            case "tweakOff": return "ACTIVER";
            case "tweakRebootHint": return "Redemarre le PC pour appliquer ce reglage.";
            case "tweak_inputlag_title": return "Reduire l input lag (Beta)";
            case "tweak_inputlag_desc": return "Active le GPU scheduling materiel (HAGS) pour reduire la latence d affichage. Redemarrage requis.";
            case "tweak_keyboard_title": return "Reduire le temps de saisie clavier";
            case "tweak_keyboard_desc": return "Met le delai de repetition clavier au minimum.";
            case "tweak_perfcounters_title": return "Desactiver les compteurs de perf Windows";
            case "tweak_perfcounters_desc": return "Coupe la collecte de compteurs de performance pour liberer du CPU.";
            case "tweak_gamemode_title": return "Performances max pour les jeux";
            case "tweak_gamemode_desc": return "Active le Mode Jeu de Windows (priorise le jeu actif).";
            case "tweak_priority_title": return "Priorite mini aux taches de fond";
            case "tweak_priority_desc": return "Favorise le premier plan (Win32PrioritySeparation) pour le jeu.";
            case "tweak_netpower_title": return "Couper l economie d energie reseau";
            case "tweak_netpower_desc": return "Desactive l economie d energie des cartes reseau pour stabiliser la connexion.";
            case "tweak_gamedvr_title": return "Couper les enregistrements Game Bar";
            case "tweak_gamedvr_desc": return "Desactive la capture auto de la Xbox Game Bar pour gagner des FPS.";
            case "tweak_coreparking_title": return "Garder tous les coeurs actifs";
            case "tweak_coreparking_desc": return "Desactive le core parking pour des performances CPU constantes.";
            case "tweak_lastaccess_title": return "Couper l horodatage NTFS";
            case "tweak_lastaccess_desc": return "Desactive le journal du dernier acces aux fichiers pour soulager le disque.";
            case "tweak_superfetch_title": return "Desactiver SuperFetch";
            case "tweak_superfetch_desc": return "Arrete le service SysMain pour liberer de la RAM.";
            case "tweak_indexing_title": return "Desactiver l indexation Windows";
            case "tweak_indexing_desc": return "Arrete le service WSearch pour liberer le disque.";
            case "tweak_ultimate_title": return "Mode Performances ultimes";
            case "tweak_ultimate_desc": return "Active le plan d alimentation Performances ultimes de Windows.";
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
            case "importAdd": return "AJOUTER";
            case "importOpen": return "OUVRIR";
            case "importEmpty": return "Aucune capture scoreboard aujourd hui";
            case "manualImportAdded": return "Capture scoreboard manuelle ajoutee.";
            case "manualImportFailed": return "Import de la capture impossible : ";
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
        if (monitorBox != null) monitorBox.Visible = free && !compact;
        if (monitorLabel != null) monitorLabel.Visible = free && !compact;
        if (freeStatsCard != null) freeStatsCard.Visible = free && !compact;
        importsLabel.Visible = free && !compact;
        if (importAddButton != null) importAddButton.Visible = free && !compact;
        if (importOpenButton != null) importOpenButton.Visible = free && !compact;
        historyList.Visible = free && !compact;
        // The journal lives on the free page only; the optimisation page conveys boost/overlay
        // state through the button colour and status labels instead.
        journalLabel.Visible = free || compact;
        logBox.Visible = free || compact;

        if (optimisationInfoCard != null) optimisationInfoCard.Visible = optimisation && !compact;
        if (optimisationAllButton != null) optimisationAllButton.Visible = optimisation && !compact;
        if (optimisationOverlayCard != null) optimisationOverlayCard.Visible = optimisation && !compact;
        if (optimisationBoostCard != null) optimisationBoostCard.Visible = optimisation && !compact;
        if (boostFreeRamCard != null) boostFreeRamCard.Visible = optimisation && !compact;
        if (boostPriorityCard != null) boostPriorityCard.Visible = optimisation && !compact;
        if (boostVisualCard != null) boostVisualCard.Visible = optimisation && !compact;
        if (optimisationTweaksPanel != null) optimisationTweaksPanel.Visible = optimisation && !compact;
        if (optimisation && !compact) RefreshTweakStates();

        if (settingsInfoCard != null) settingsInfoCard.Visible = settings && !compact;
        if (settingsProfileCard != null) settingsProfileCard.Visible = settings && !compact;
        if (settingsPictureCard != null) settingsPictureCard.Visible = settings && !compact;
        if (settings && !compact) RefreshSettingsPage();

        if (premiumInfoCard != null) premiumInfoCard.Visible = premium && !compact;
        if (premiumHighlightsCard != null) premiumHighlightsCard.Visible = premium && !compact;
        if (premiumClipsCard != null) premiumClipsCard.Visible = false;
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
        if (trainingDeathCard != null) trainingDeathCard.Visible = training && !compact;
        if (trainingObjectiveCard != null) trainingObjectiveCard.Visible = training && !compact;
        if (trainingWarmupCard != null) trainingWarmupCard.Visible = training && !compact;
        if (trainingVodCard != null) trainingVodCard.Visible = training && !compact;
        if (trainingHebdoCard != null) trainingHebdoCard.Visible = training && !compact;
        if (trainingQuizCard != null) trainingQuizCard.Visible = training && !compact;
        if (trainingRoutineCard != null) trainingRoutineCard.Visible = training && !compact;
        if (trainingReviewCard != null) trainingReviewCard.Visible = false;
        if (trainingReadinessCard != null) trainingReadinessCard.Visible = false;
        if (trainingHeatmapCard != null) trainingHeatmapCard.Visible = false;
        if (training) RefreshTrainingUi();

        UpdateSidebarStatuses();
        StylePageButtons(Theme);
        if (free && !compact) RefreshScoreboardJournal();
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
            ApplyRoundedChrome();
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

    private void ApplyRoundedChrome()
    {
        ApplyRoundedChrome(Controls);
    }

    private void ApplyRoundedChrome(Control.ControlCollection controls)
    {
        foreach (Control control in controls)
        {
            if (control is Button)
            {
                control.Cursor = Cursors.Hand;
                if (control != optimisationAllButton)
                {
                    SetRoundedRegion(control, control.Width <= 46 && control.Height <= 46 ? 6 : 5);
                }
            }
            else if (control is TextBox || control is ListBox)
            {
                SetRoundedRegion(control, 5);
            }
            else if (control == searchBoxLabel)
            {
                SetRoundedRegion(control, 5);
            }
            if (control.HasChildren) ApplyRoundedChrome(control.Controls);
        }
    }

    private void SetRoundedRegion(Control control, int radius)
    {
        if (control == null || control.Width <= 0 || control.Height <= 0) return;
        using (GraphicsPath path = RoundedPath(new Rectangle(0, 0, control.Width, control.Height), radius))
        {
            Region old = control.Region;
            control.Region = new Region(path);
            if (old != null) old.Dispose();
        }
    }

    private static GraphicsPath RoundedPath(Rectangle bounds, int radius)
    {
        int diameter = Math.Max(1, radius * 2);
        GraphicsPath path = new GraphicsPath();
        path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
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
        int sidebarW = ClampInt((int)(ClientSize.Width * 0.065), 74, 86);
        sidebarPanel.SetBounds(0, 0, sidebarW, ClientSize.Height);
        mainPanel.SetBounds(sidebarW, 0, Math.Max(1, ClientSize.Width - sidebarW), ClientSize.Height);

        int sidePad = ClampInt(sidebarW / 7, 8, 12);
        int navW = sidebarW - sidePad * 2;
        int icon = ClampInt(navW, 44, 50);
        int iconX = (sidebarW - icon) / 2;
        if (brandLogoBox != null) brandLogoBox.SetBounds(iconX, 14, icon, 46);
        if (titleLabel != null) titleLabel.SetBounds(sidePad + 4, 18, navW - 8, 38);
        if (freeAccessButton != null) freeAccessButton.SetBounds(iconX, 88, icon, 42);
        if (premiumButton != null) premiumButton.SetBounds(iconX, 140, icon, 42);
        if (trainingButton != null) trainingButton.SetBounds(iconX, 192, icon, 42);
        if (optimisationButton != null) optimisationButton.SetBounds(iconX, 244, icon, 42);
        if (settingsButton != null) settingsButton.SetBounds(iconX, 296, icon, 42);
        if (premiumSidebarLabel != null) premiumSidebarLabel.Visible = false;
        if (recorderSidebarLabel != null) recorderSidebarLabel.Visible = false;
        if (overlayHotkeySidebarLabel != null) overlayHotkeySidebarLabel.Visible = false;
        if (actionOverlayHotkeySidebarLabel != null) actionOverlayHotkeySidebarLabel.Visible = false;
        if (updateStatusLabel != null) updateStatusLabel.Visible = false;

        if (profilePanel != null)
        {
            int profileH = 92;
            profilePanel.SetBounds(sidePad, Math.Max(526, ClientSize.Height - profileH - 24), navW, profileH);
            if (profilePictureBox != null)
            {
                int pic = ClampInt(navW - 4, 34, 44);
                profilePictureBox.SetBounds((navW - pic) / 2, 6, pic, pic);
            }
            if (profileNameLabel != null) profileNameLabel.SetBounds(22 + ClampInt(profileH - 54, 38, 48), 18, Math.Max(40, navW - 34 - ClampInt(profileH - 54, 38, 48)), profileH - 34);
            if (versionLabel != null) versionLabel.SetBounds(0, 58, navW, 22);
        }
    }

    private void LayoutFreePage(int contentX, int contentW)
    {
        int h = mainPanel.ClientSize.Height;
        if (compactMode)
        {
            int cardY = 92;
            int compactConnH = 138;
            int compactControlsH = 112;
            if (freeConnectionCard != null) freeConnectionCard.SetBounds(contentX, cardY, contentW, compactConnH);
            if (freeControlsCard != null) freeControlsCard.SetBounds(contentX, cardY + compactConnH + 14, contentW, compactControlsH);
            int compactConnectW = Math.Min(336, Math.Max(180, contentW - 48));
            if (freePageDescLabel != null) freePageDescLabel.SetBounds(24, 18, Math.Max(180, contentW - compactConnectW - 72), 42);
            if (statusLabel != null) statusLabel.SetBounds(24, 70, 260, 24);
            if (connectionLabel != null) connectionLabel.SetBounds(24, 98, 360, 24);
            if (connectButton != null) connectButton.SetBounds(Math.Max(24, contentW - compactConnectW - 24), 50, compactConnectW, 38);
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
        int gap = 16;
        int bottom = 24;
        int listLabelH = 20;
        int fixedCards = 58 + 124 + 140 + 92 + gap * 4 + listLabelH + 8 + bottom;
        double scale = Math.Min(1.0, Math.Max(0.78, (double)Math.Max(1, h - 92 - listLabelH - 8 - bottom - gap * 4) / (58 + 124 + 140 + 92 + 56)));

        int infoH = ScaleHeight(58, scale, 52);
        int connH = ScaleHeight(124, scale, 108);
        int controlsH = ScaleHeight(140, scale, 118);
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

        if (freePageTitleLabel != null) freePageTitleLabel.SetBounds(0, 8, Math.Min(520, contentW), 38);
        int connectW = Math.Min(336, Math.Max(180, contentW - 48));
        if (freePageDescLabel != null) freePageDescLabel.SetBounds(24, 18, Math.Max(220, contentW - connectW - 72), 44);
        if (statusLabel != null) statusLabel.SetBounds(24, 70, 260, 24);
        if (connectionLabel != null) connectionLabel.SetBounds(24, 94, Math.Max(220, contentW - connectW - 72), 24);
        if (connectButton != null) connectButton.SetBounds(Math.Max(24, contentW - connectW - 24), 43, connectW, 38);
        if (monitorLabel != null) monitorLabel.SetBounds(24, 46, 120, 20);
        if (monitorBox != null) monitorBox.SetBounds(154, 44, Math.Min(340, Math.Max(180, contentW - 200)), 24);
        if (hintLabel != null) hintLabel.SetBounds(24, Math.Max(74, controlsH - 40), contentW - 48, 30);
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
        int importButtonW = Math.Min(86, Math.Max(64, (colW - 8) / 3));
        if (importsLabel != null) importsLabel.SetBounds(contentX, y, Math.Max(60, colW - importButtonW * 2 - 16), listLabelH);
        if (importAddButton != null) importAddButton.SetBounds(contentX + colW - importButtonW * 2 - 8, y - 4, importButtonW, 28);
        if (importOpenButton != null) importOpenButton.SetBounds(contentX + colW - importButtonW, y - 4, importButtonW, 28);
        if (historyList != null) historyList.SetBounds(contentX, listY, colW, listH);
        if (journalLabel != null && activePage == "free") journalLabel.SetBounds(contentX + colW + colGap, y, colW, listLabelH);
        if (logBox != null && activePage == "free") logBox.SetBounds(contentX + colW + colGap, listY, colW, listH);
    }

    private void LayoutPremiumPage(int contentX, int contentW)
    {
        int top = 92;
        int bottom = 20;
        int available = Math.Max(1, mainPanel.ClientSize.Height - top - bottom);
        int[] baseHeights = new[] { 64, 184, 106, 136 };
        int[] minHeights = new[] { 58, 154, 82, 112 };
        int gap = ClampInt((available - 526) / 3, 12, 20);
        double scale = Math.Min(1.0, (double)Math.Max(1, available - gap * 3) / 526);

        Panel[] cards = new[] { premiumInfoCard, premiumHighlightsCard, premiumAccessCard, premiumAdvancedCard };
        int y = top;
        for (int i = 0; i < cards.Length; i++)
        {
            int cardH = ScaleHeight(baseHeights[i], scale, minHeights[i]);
            if (cards[i] != null) cards[i].SetBounds(contentX, y, contentW, cardH);
            y += cardH + gap;
        }
        if (premiumClipsCard != null) premiumClipsCard.SetBounds(contentX, y, contentW, 1);

        if (premiumPageTitleLabel != null) premiumPageTitleLabel.SetBounds(0, 6, Math.Min(520, contentW), 34);
        if (premiumPageDescLabel != null) premiumPageDescLabel.SetBounds(0, 42, contentW, 22);
        if (highlightsToggle != null) highlightsToggle.SetBounds(Math.Max(24, contentW - 68), 20, 46, 24);
        if (highlightsDescLabel != null) highlightsDescLabel.Width = contentW - 48;
        if (highlightsStatusLabel != null) highlightsStatusLabel.SetBounds(24, 92, contentW - 48, 22);
        if (clipsFolderTitleLabel != null) clipsFolderTitleLabel.SetBounds(24, 124, 260, 22);
        if (clipsFolderValueLabel != null) clipsFolderValueLabel.SetBounds(24, 150, Math.Max(220, contentW - 246), 28);
        int openX = Math.Max(24, contentW - 98);
        int chooseX = Math.Max(24, openX - 92);
        if (clipsFolderButton != null) clipsFolderButton.SetBounds(chooseX, 138, 82, 34);
        if (clipsOpenFolderButton != null) clipsOpenFolderButton.SetBounds(openX, 138, 74, 34);
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
        if (settingsProfileCard != null) settingsProfileCard.SetBounds(contentX, y, contentW, 118);
        y += 138;
        if (settingsPictureCard != null) settingsPictureCard.SetBounds(contentX, y, contentW, 154);

        if (settingsPageTitleLabel != null) settingsPageTitleLabel.Width = Math.Min(420, contentW - 48);
        if (settingsPageDescLabel != null) settingsPageDescLabel.SetBounds(24, 62, contentW - 48, 42);
        int saveW = 92;
        int chooseW = 108;
        int saveX = Math.Max(24, contentW - saveW - 24);
        if (settingsActivisionBox != null) settingsActivisionBox.SetBounds(24, 52, Math.Max(180, saveX - 48), 28);
        if (settingsSaveButton != null) settingsSaveButton.SetBounds(saveX, 48, saveW, 32);

        int previewY = 58;
        int urlX = 96;
        int chooseX = Math.Max(urlX, saveX - chooseW - 16);
        int urlW = Math.Max(180, chooseX - urlX - 14);
        if (settingsPictureLabel != null) settingsPictureLabel.SetBounds(24, 22, Math.Min(320, contentW - 48), 22);
        if (settingsPicturePreviewBox != null) settingsPicturePreviewBox.SetBounds(24, previewY - 4, 58, 58);
        if (settingsPictureUrlBox != null) settingsPictureUrlBox.SetBounds(urlX, previewY, urlW, 28);
        if (settingsChoosePictureButton != null) settingsChoosePictureButton.SetBounds(chooseX, previewY - 2, chooseW, 28);
        if (settingsStatusLabel != null) settingsStatusLabel.SetBounds(urlX, 96, Math.Max(200, contentW - urlX - 24), 42);
    }

    private void LayoutTrainingPage(int contentX, int contentW)
    {
        int h = mainPanel.ClientSize.Height;
        int y = 92;
        int gap = 14;
        int bottom = 24;
        int infoH = ClampInt((int)(h * 0.10), 66, 78);

        if (trainingInfoCard != null) trainingInfoCard.SetBounds(contentX, y, contentW, infoH);
        y += infoH + gap;

        // The quiz + routine coach tools keep their place at the bottom; the five Training
        // Lab cards fill the band between the info strip and the tools.
        int toolH = ClampInt((int)(h * 0.26), 150, 190);
        int toolsY = h - bottom - toolH;

        int bandY = y;
        int bandH = Math.Max(180, toolsY - gap - bandY);
        int cardGap = 12;
        int rowH = (bandH - cardGap * 2) / 3;
        int splitGap = 14;
        int leftW = (contentW - splitGap) / 2;
        int rightX = contentX + leftW + splitGap;
        int rightW = contentW - leftW - splitGap;
        int row1 = bandY;
        int row2 = bandY + rowH + cardGap;
        int row3 = bandY + (rowH + cardGap) * 2;

        if (trainingDeathCard != null) trainingDeathCard.SetBounds(contentX, row1, leftW, rowH);
        if (trainingObjectiveCard != null) trainingObjectiveCard.SetBounds(rightX, row1, rightW, rowH);
        if (trainingWarmupCard != null) trainingWarmupCard.SetBounds(contentX, row2, leftW, rowH);
        if (trainingVodCard != null) trainingVodCard.SetBounds(rightX, row2, rightW, rowH);
        if (trainingHebdoCard != null) trainingHebdoCard.SetBounds(contentX, row3, contentW, rowH);

        LayoutTrainingCardRow(trainingDeathButtons, leftW, 34, 26);
        if (trainingDeathResetButton != null) trainingDeathResetButton.SetBounds(leftW - 76, 8, 60, 22);
        if (trainingDeathTotalLabel != null) trainingDeathTotalLabel.SetBounds(16, Math.Max(64, rowH - 22), leftW - 32, 16);

        if (trainingObjectiveVerdictButton != null) trainingObjectiveVerdictButton.SetBounds(rightW - 130, 8, 114, 22);
        if (trainingObjectiveBox != null) trainingObjectiveBox.SetBounds(16, 38, rightW - 32, Math.Max(22, rowH - 50));

        LayoutTrainingCardRow(trainingWarmupButtons, leftW, 38, 28);
        if (trainingWarmupProgressLabel != null) trainingWarmupProgressLabel.SetBounds(leftW - 80, 10, 64, 18);

        if (trainingVodBox != null) trainingVodBox.SetBounds(16, 34, rightW - 32, Math.Max(28, rowH - 44));

        LayoutTrainingCardRow(trainingHebdoButtons, contentW, 38, 28);
        if (trainingHebdoProgressLabel != null) trainingHebdoProgressLabel.SetBounds(contentW - 110, 10, 94, 18);

        y = toolsY;
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
    }

    // Lays a row of equal-width toggle/counter buttons inside a Training Lab card.
    private void LayoutTrainingCardRow(Button[] buttons, int cardW, int rowY, int btnH)
    {
        if (buttons == null || buttons.Length == 0) return;
        int rowGap = 6;
        int btnW = Math.Max(40, (cardW - 32 - rowGap * (buttons.Length - 1)) / buttons.Length);
        for (int i = 0; i < buttons.Length; i++)
        {
            if (buttons[i] != null) buttons[i].SetBounds(16 + i * (btnW + rowGap), rowY, btnW, btnH);
        }
    }

    private void LayoutOptimisationPage(int contentX, int contentW)
    {
        if (optimisationInfoCard == null || optimisationOverlayCard == null) return;
        if (compactMode) return; // compact layout positions the journal via the free-page path
        int pageTop = 92;
        int infoH = 78;
        optimisationInfoCard.SetBounds(contentX, pageTop, contentW, infoH);
        if (optimisationPageTitleLabel != null) optimisationPageTitleLabel.SetBounds(0, 8, Math.Min(440, contentW - 190), 30);
        if (optimisationPageDescLabel != null) optimisationPageDescLabel.SetBounds(0, 40, Math.Max(260, contentW - 330), 22);
        if (optimisationAllButton != null)
        {
            optimisationAllButton.SetBounds(contentX + Math.Max(0, contentW - 286), pageTop + 24, 286, 38);
            optimisationAllButton.Region = null;
            optimisationAllButton.BringToFront();
        }

        // Everything below the info strip lives in one scrollable panel.
        int panelTop = pageTop + infoH + 16;
        int panelH = Math.Max(140, mainPanel.ClientSize.Height - panelTop - 16);
        if (optimisationTweaksPanel != null) optimisationTweaksPanel.SetBounds(contentX, panelTop, contentW, panelH);

        int gap = 16;
        int innerW = contentW - 26; // leave room for the vertical scrollbar
        int cardW = Math.Max(240, (innerW - gap) / 2);
        int bigH = 178;
        // The 5 existing cards (coordinates now relative to the scroll panel).
        Panel[] cards = { optimisationOverlayCard, optimisationBoostCard, boostFreeRamCard, boostPriorityCard, boostVisualCard };
        for (int i = 0; i < cards.Length; i++)
        {
            if (cards[i] == null) continue;
            cards[i].SetBounds((i % 2) * (cardW + gap), (i / 2) * (bigH + gap), cardW, bigH);
        }
        int bigRows = (cards.Length + 1) / 2;
        int afterBig = bigRows * (bigH + gap);

        LayoutOptimisationCard(optimisationOverlayCard, optimisationOverlayTitleLabel, optimisationOverlayDescLabel, overlayToggleButton, optimisationOverlayStatusLabel);
        LayoutOptimisationCard(optimisationBoostCard, optimisationBoostTitleLabel, optimisationBoostDescLabel, gameBoostButton, optimisationBoostStatusLabel);
        LayoutOptimisationCard(boostFreeRamCard, boostFreeRamTitleLabel, boostFreeRamDescLabel, boostFreeRamButton, null);
        LayoutOptimisationCard(boostPriorityCard, boostPriorityTitleLabel, boostPriorityDescLabel, boostPriorityButton, null);
        LayoutOptimisationCard(boostVisualCard, boostVisualTitleLabel, boostVisualDescLabel, boostVisualButton, null);

        // Advanced tweak cards below, in the same 2-column grid.
        Label tweaksTitle = NamedLabel(optimisationTweaksPanel, "tweaksTitle");
        if (tweaksTitle != null) tweaksTitle.SetBounds(4, afterBig, innerW - 8, 22);
        Label tweaksWarning = NamedLabel(optimisationTweaksPanel, "tweaksWarning");
        if (tweaksWarning != null) tweaksWarning.SetBounds(4, afterBig + 26, innerW - 8, 34);
        int tweakTop = afterBig + 68;
        int tweakH = bigH; // identical card height to the existing optimisation cards
        for (int j = 0; j < TweakIds.Length; j++)
        {
            Panel card;
            if (!tweakCards.TryGetValue(TweakIds[j], out card) || card == null) continue;
            card.SetBounds((j % 2) * (cardW + gap), tweakTop + (j / 2) * (tweakH + gap), cardW, tweakH);
            Button bt = null;
            tweakButtons.TryGetValue(TweakIds[j], out bt);
            LayoutOptimisationCard(card, NamedLabel(card, "tweakTitle_" + TweakIds[j]), NamedLabel(card, "tweakDesc_" + TweakIds[j]), bt, null);
        }

        CheckBox[] overlayChecks = { overlayGamesCheck, overlayHighlightsCheck, overlayMetaCheck, overlayPerfCheck, boostFreeRamCheck, boostPriorityCheck, boostVisualCheck };
        foreach (CheckBox cb in overlayChecks) if (cb != null) cb.Visible = false;
    }

    private void LayoutOptimisationCard(Panel card, Label title, Label desc, Button toggle, Label status)
    {
        if (card == null) return;
        int w = card.Width;
        if (title != null) title.SetBounds(24, 70, Math.Max(160, w - 48), 24);
        if (desc != null) desc.SetBounds(24, 102, Math.Max(160, w - 48), 40);
        if (toggle != null) toggle.SetBounds(Math.Max(24, w - 104), 24, 80, 28);
        if (status != null) status.SetBounds(24, 146, Math.Max(160, w - 48), 20);
    }

    private string[] TrainingDeathCauses()
    {
        return new string[] { T("trainingDeathRotation"), T("trainingDeathCover"), T("trainingDeathPush"), T("trainingDeathZone") };
    }

    private string[] TrainingWarmupItems()
    {
        return new string[] { T("trainingWarmupAim"), T("trainingWarmupTilt"), T("trainingWarmupRecoil"), T("trainingWarmupRegain"), T("trainingWarmupMental") };
    }

    private string[] TrainingHebdoDays()
    {
        return new string[] { "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim" };
    }

    private string TrainingObjectiveVerdictText()
    {
        return trainingObjectiveVerdict == 1 ? T("trainingObjectiveDone") : trainingObjectiveVerdict == 2 ? T("trainingObjectiveRedo") : T("trainingObjectiveNone");
    }

    private void OnTrainingDeathClick(int idx)
    {
        if (idx < 0 || idx >= trainingDeathCounts.Length) return;
        trainingDeathCounts[idx]++;
        RefreshTrainingUi();
        SaveSession();
    }

    private void ResetTrainingDeaths()
    {
        trainingDeathCounts = new int[4];
        RefreshTrainingUi();
        SaveSession();
    }

    private void ToggleTrainingWarmup(int idx)
    {
        if (idx < 0 || idx >= trainingWarmupDone.Length) return;
        trainingWarmupDone[idx] = !trainingWarmupDone[idx];
        RefreshTrainingUi();
        SaveSession();
    }

    private void ToggleTrainingHebdo(int idx)
    {
        if (idx < 0 || idx >= trainingHebdoDone.Length) return;
        trainingHebdoDone[idx] = !trainingHebdoDone[idx];
        RefreshTrainingUi();
        SaveSession();
    }

    private void CycleTrainingObjectiveVerdict()
    {
        trainingObjectiveVerdict = (trainingObjectiveVerdict + 1) % 3;
        RefreshTrainingUi();
        SaveSession();
    }

    private void RefreshTrainingCards(WzTheme theme)
    {
        updatingTrainingCardsUi = true;
        try
        {
            Label l;
            l = NamedLabel(trainingDeathCard, "trainingDeathTitle"); if (l != null) l.Text = T("trainingDeathTitle");
            l = NamedLabel(trainingObjectiveCard, "trainingObjectiveTitle"); if (l != null) l.Text = T("trainingObjectiveTitle");
            l = NamedLabel(trainingWarmupCard, "trainingWarmupTitle"); if (l != null) l.Text = T("trainingWarmupTitle");
            l = NamedLabel(trainingVodCard, "trainingVodTitle"); if (l != null) l.Text = T("trainingVodTitle");
            l = NamedLabel(trainingHebdoCard, "trainingHebdoTitle"); if (l != null) l.Text = T("trainingHebdoTitle");

            if (trainingDeathResetButton != null) { trainingDeathResetButton.Text = T("trainingReset"); StyleSecondaryButton(trainingDeathResetButton, theme); }
            string[] causes = TrainingDeathCauses();
            int total = 0;
            for (int i = 0; i < trainingDeathButtons.Length; i++)
            {
                if (trainingDeathButtons[i] == null) continue;
                int c = i < trainingDeathCounts.Length ? trainingDeathCounts[i] : 0;
                total += c;
                trainingDeathButtons[i].Text = (i < causes.Length ? causes[i] : "") + " " + c;
                if (c > 0) StylePrimaryButton(trainingDeathButtons[i], theme); else StyleSecondaryButton(trainingDeathButtons[i], theme);
            }
            if (trainingDeathTotalLabel != null) trainingDeathTotalLabel.Text = total + " " + T("trainingDeathTotal");

            if (trainingObjectiveBox != null && !trainingObjectiveBox.Focused && trainingObjectiveBox.Text != trainingObjectiveText) trainingObjectiveBox.Text = trainingObjectiveText;
            if (trainingObjectiveVerdictButton != null)
            {
                trainingObjectiveVerdictButton.Text = TrainingObjectiveVerdictText();
                if (trainingObjectiveVerdict == 1)
                {
                    StylePrimaryButton(trainingObjectiveVerdictButton, theme);
                }
                else if (trainingObjectiveVerdict == 2)
                {
                    StyleSecondaryButton(trainingObjectiveVerdictButton, theme);
                    trainingObjectiveVerdictButton.BackColor = theme.Warn;
                    trainingObjectiveVerdictButton.ForeColor = theme.Canvas;
                }
                else
                {
                    StyleSecondaryButton(trainingObjectiveVerdictButton, theme);
                }
            }

            string[] warm = TrainingWarmupItems();
            int warmDone = 0;
            for (int i = 0; i < trainingWarmupButtons.Length; i++)
            {
                if (trainingWarmupButtons[i] == null) continue;
                bool on = i < trainingWarmupDone.Length && trainingWarmupDone[i];
                if (on) warmDone++;
                trainingWarmupButtons[i].Text = i < warm.Length ? warm[i] : "";
                if (on) StylePrimaryButton(trainingWarmupButtons[i], theme); else StyleSecondaryButton(trainingWarmupButtons[i], theme);
            }
            if (trainingWarmupProgressLabel != null) trainingWarmupProgressLabel.Text = warmDone + "/5";

            if (trainingVodBox != null && !trainingVodBox.Focused && trainingVodBox.Text != trainingVodNotes) trainingVodBox.Text = trainingVodNotes;

            string[] days = TrainingHebdoDays();
            int hebdoDone = 0;
            for (int i = 0; i < trainingHebdoButtons.Length; i++)
            {
                if (trainingHebdoButtons[i] == null) continue;
                bool on = i < trainingHebdoDone.Length && trainingHebdoDone[i];
                if (on) hebdoDone++;
                trainingHebdoButtons[i].Text = i < days.Length ? days[i] : "";
                if (on) StylePrimaryButton(trainingHebdoButtons[i], theme); else StyleSecondaryButton(trainingHebdoButtons[i], theme);
            }
            if (trainingHebdoProgressLabel != null) trainingHebdoProgressLabel.Text = hebdoDone + "/7 " + T("trainingHebdoDays");
        }
        finally
        {
            updatingTrainingCardsUi = false;
        }
    }

    private string TrainingDeathsState()
    {
        return string.Join(",", Array.ConvertAll(trainingDeathCounts, n => n.ToString()));
    }

    private void LoadTrainingDeathsState(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        string[] parts = value.Split(',');
        for (int i = 0; i < parts.Length && i < trainingDeathCounts.Length; i++)
        {
            int n;
            if (int.TryParse(parts[i], out n) && n >= 0) trainingDeathCounts[i] = n;
        }
    }

    private string TrainingBitsState(bool[] flags)
    {
        if (flags == null) return "";
        var sb = new StringBuilder();
        foreach (bool b in flags) sb.Append(b ? '1' : '0');
        return sb.ToString();
    }

    private void LoadTrainingBitsState(string value, bool[] flags)
    {
        if (string.IsNullOrWhiteSpace(value) || flags == null) return;
        for (int i = 0; i < flags.Length && i < value.Length; i++) flags[i] = value[i] == '1';
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

    // The category/module checklist UI was replaced by the dedicated Training Lab cards.
    // Module state is now static data only used to enrich the coach payload, so there is
    // nothing to capture from the (removed) controls here.
    private void SaveCurrentTrainingModuleState()
    {
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
        trainingDeathCounts = new int[4];
        trainingWarmupDone = new bool[5];
        trainingHebdoDone = new bool[7];
        trainingObjectiveText = "";
        trainingObjectiveVerdict = 0;
        trainingVodNotes = "";
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
        label = NamedLabel(trainingReviewCard, "trainingReviewTitleLabel");
        if (label != null) label.Text = T("trainingReviewTitle");
        label = NamedLabel(trainingReadinessCard, "trainingReadinessTitleLabel");
        if (label != null) label.Text = T("trainingReadinessTitle");
        label = NamedLabel(trainingHeatmapCard, "trainingHeatmapTitleLabel");
        if (label != null) label.Text = T("trainingHeatmapTitle");
        label = NamedLabel(trainingHeatmapCard, "trainingHeatmapDescLabel");
        if (label != null) label.Text = T("trainingHeatmapDesc");
        label = NamedLabel(trainingQuizCard, "trainingQuizTitleLabel");
        if (label != null) label.Text = T("trainingQuizTitle");
        label = NamedLabel(trainingRoutineCard, "trainingRoutineTitleLabel");
        if (label != null) label.Text = T("trainingRoutineTitle");

        if (trainingButton != null) trainingButton.Text = T("trainingAccess");
        ApplySidebarIcons();
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
        RefreshTrainingCards(theme);

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
            var ok = new Button { Text = T("audioSave"), Location = new Point(232, 174), Size = new Size(104, 32), DialogResult = DialogResult.OK, BackColor = Color.FromArgb(22, 60, 255), ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand };
            var cancel = new Button { Text = T("audioCancel"), Location = new Point(344, 174), Size = new Size(96, 32), DialogResult = DialogResult.Cancel, BackColor = Color.FromArgb(42, 42, 48), ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand };
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

                    SafeUi(delegate
                    {
                        if (!string.IsNullOrWhiteSpace(weapon)) metaTodayWeapon = weapon;
                        if (metaTodayLabel != null) metaTodayLabel.Text = "";
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

    // JSON reads go through a real parser (JavaScriptSerializer, in-box via System.Web.Extensions)
    // instead of regex: this handles escaping, unicode and nested objects/arrays correctly and
    // only ever returns top-level keys. Each helper keeps the same value-type contract the old
    // regex enforced (JsonNumber matches numbers only, JsonString strings only, etc.).
    [ThreadStatic]
    private static System.Web.Script.Serialization.JavaScriptSerializer jsonSerializer;

    private static System.Collections.Generic.Dictionary<string, object> JsonObject(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            if (jsonSerializer == null) jsonSerializer = new System.Web.Script.Serialization.JavaScriptSerializer();
            return jsonSerializer.DeserializeObject(json) as System.Collections.Generic.Dictionary<string, object>;
        }
        catch
        {
            return null;
        }
    }

    private static object JsonValue(string json, string key)
    {
        var obj = JsonObject(json);
        object value;
        if (obj != null && obj.TryGetValue(key, out value)) return value;
        return null;
    }

    private static string JsonNumber(string json, string key)
    {
        object value = JsonValue(json, key);
        if (value is int) return ((int)value).ToString(System.Globalization.CultureInfo.InvariantCulture);
        if (value is long) return ((long)value).ToString(System.Globalization.CultureInfo.InvariantCulture);
        if (value is decimal) return ((decimal)value).ToString(System.Globalization.CultureInfo.InvariantCulture);
        if (value is double) return ((double)value).ToString(System.Globalization.CultureInfo.InvariantCulture);
        return "";
    }

    private static System.Collections.Generic.List<string> JsonStringArray(string json, string key)
    {
        var list = new System.Collections.Generic.List<string>();
        object[] arr = JsonValue(json, key) as object[];
        if (arr == null) return list;
        foreach (object item in arr)
        {
            string s = item as string;
            if (s != null) list.Add(s);
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
        RefreshOptimisationOptionsUi();
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
        CheckBox cb = new ToggleSwitch
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
            TabStop = false,
            Cursor = Cursors.Hand
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
        return new ToggleSwitch
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

    // Builds the end-of-game confirmation from the engine's "Uploaded game #N: X kills,
    // Y damage, place #Z" line, so the user sees the scoreboard was read, captured and sent.
    private string EndGameToastText(string line)
    {
        try
        {
            Match m = Regex.Match(line, @"(\d+)\s*kills.*?(\d+)\s*damage.*?#\s*(\d+)");
            if (m.Success)
            {
                return "[OK] " + T("endGameSeen") + "  " + m.Groups[1].Value + " kills - "
                    + m.Groups[2].Value + " dmg - #" + m.Groups[3].Value;
            }
        }
        catch { }
        return "[OK] " + T("endGameSeen");
    }

    // The screen we capture/record: the pinned monitor, else the foreground game's screen.
    private Screen CapturedScreen()
    {
        try
        {
            Screen[] all = Screen.AllScreens;
            if (captureMonitorIndex >= 0 && captureMonitorIndex < all.Length) return all[captureMonitorIndex];
            return Screen.FromHandle(GetForegroundWindow()) ?? Screen.PrimaryScreen;
        }
        catch { return Screen.PrimaryScreen; }
    }

    private void ShowToast(string message, int durationMs = 2200, Screen targetScreen = null, bool topLeft = false)
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
            // can place the toast on the captured/recorded screen.
            Screen target = targetScreen ?? Screen.FromHandle(GetForegroundWindow()) ?? Screen.PrimaryScreen;
            Rectangle area = (target ?? Screen.PrimaryScreen).WorkingArea;
            form.Location = topLeft
                ? new Point(area.Left + 24, area.Top + 24)
                : new Point(area.Left + (area.Width - form.Width) / 2, area.Bottom - form.Height - 80);

            toastTimer = new Timer { Interval = Math.Max(1200, durationMs) };
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
    private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    [DllImport("user32.dll")]
    private static extern bool SetProcessDPIAware();

    // Without this the process is DPI-virtualized: GetWindowRect (physical px) and
    // CopyFromScreen disagree on scaled displays, so the captured region is wrong.
    private static void EnableDpiAwareness()
    {
        try { if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return; } catch { } // PER_MONITOR_AWARE_V2
        try { SetProcessDPIAware(); } catch { }
    }

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
            if (activePage == "free" && !compactMode && DateTime.UtcNow.Subtract(lastImportRefreshUtc).TotalSeconds > 5)
            {
                lastImportRefreshUtc = DateTime.UtcNow;
                RefreshScoreboardJournal();
            }
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
            deviceToken = UnprotectToken(ExtractLine(text, "token"));
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
            LoadTrainingDeathsState(ExtractLine(text, "trainingDeaths"));
            LoadTrainingBitsState(ExtractLine(text, "trainingWarmup"), trainingWarmupDone);
            LoadTrainingBitsState(ExtractLine(text, "trainingHebdo"), trainingHebdoDone);
            trainingObjectiveText = DecodeSessionValue(ExtractLine(text, "trainingObjective"));
            int savedVerdict;
            if (int.TryParse(ExtractLine(text, "trainingObjectiveVerdict"), out savedVerdict) && savedVerdict >= 0 && savedVerdict <= 2) trainingObjectiveVerdict = savedVerdict;
            trainingVodNotes = DecodeSessionValue(ExtractLine(text, "trainingVod"));
            int savedMonitor;
            if (int.TryParse(ExtractLine(text, "captureMonitor"), out savedMonitor) && savedMonitor >= -1) captureMonitorIndex = savedMonitor;
            tweakBackups = ExtractLine(text, "tweakBackups");
            ultimateSchemeGuid = ExtractLine(text, "ultimateScheme");
            LoadTrainingReviewState(ExtractLine(text, "trainingReview"));
            LoadTrainingZonesState(ExtractLine(text, "trainingZones"));
            if (highlightsToggle != null) highlightsToggle.Checked = highlightsProEnabled;
            RefreshTrainingUi();
            RefreshClipsFolderUi();
        }
        catch (Exception ex)
        {
            // A corrupt or partially-written session shouldn't be silent: log it, then fall
            // back to a clean unauthenticated state so the app still starts.
            LogCrash(ex);
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

        var lines = new List<KeyValuePair<string, string>>();
        Action<string, string> put = delegate(string key, string value)
        {
            lines.Add(new KeyValuePair<string, string>(key, value ?? ""));
        };
        Action<string, bool> putBool = delegate(string key, bool value) { put(key, value ? "1" : "0"); };

        put("site", site);
        put("token", ProtectToken(deviceToken));
        put("userName", connectedName);
        put("profilePicture", profilePictureUrl);
        put("theme", themeMode);
        put("language", languageCode);
        putBool("highlightsPro", highlightsProEnabled);
        put("clipsFolder", clipsFolderPath);
        put("clipMode", clipMode);
        put("clipSeconds", highlightClipSeconds.ToString());
        put("socialFormat", socialFormat);
        put("music", musicPath);
        put("sysAudio", systemAudioDevice);
        put("micAudio", micAudioDevice);
        putBool("compactMode", compactMode);
        put("overlayX", overlayX.ToString());
        put("overlayY", overlayY.ToString());
        putBool("overlayShowGames", overlayShowGames);
        putBool("overlayShowHighlights", overlayShowHighlights);
        putBool("overlayShowMeta", overlayShowMeta);
        putBool("overlayShowPerf", overlayShowPerf);
        putBool("boostFreeRam", boostFreeRam);
        putBool("boostPriority", boostPriority);
        putBool("boostVisualEffects", boostVisualEffects);
        put("trainingGoal", trainingGoal);
        put("trainingReview", TrainingReviewState());
        put("trainingZones", TrainingZonesState());
        put("trainingModule", trainingModuleKey);
        put("trainingModuleStates", trainingModuleStates);
        put("trainingModuleNotes", trainingModuleNotes);
        put("trainingCoachResult", EncodeSessionValue(trainingCoachResult));
        put("trainingRoutineResult", EncodeSessionValue(trainingRoutineResult));
        put("trainingDeaths", TrainingDeathsState());
        put("trainingWarmup", TrainingBitsState(trainingWarmupDone));
        put("trainingHebdo", TrainingBitsState(trainingHebdoDone));
        put("trainingObjective", EncodeSessionValue(trainingObjectiveText));
        put("trainingObjectiveVerdict", trainingObjectiveVerdict.ToString());
        put("trainingVod", EncodeSessionValue(trainingVodNotes));
        put("captureMonitor", captureMonitorIndex.ToString());
        put("tweakBackups", tweakBackups);
        put("ultimateScheme", ultimateSchemeGuid);

        var sb = new StringBuilder();
        for (int i = 0; i < lines.Count; i++)
        {
            if (i > 0) sb.Append(Environment.NewLine);
            sb.Append(lines[i].Key).Append('=').Append(lines[i].Value);
        }
        File.WriteAllText(sessionPath, sb.ToString(), Encoding.UTF8);
    }

    // The device token authenticates this machine to the site, so we never persist it in
    // clear text. DPAPI ties the ciphertext to the current Windows user; an "enc:" prefix
    // marks protected values so older plaintext sessions still load and re-encrypt on save.
    private static string ProtectToken(string plain)
    {
        if (string.IsNullOrEmpty(plain)) return "";
        try
        {
            byte[] cipher = System.Security.Cryptography.ProtectedData.Protect(
                Encoding.UTF8.GetBytes(plain), null, System.Security.Cryptography.DataProtectionScope.CurrentUser);
            return "enc:" + Convert.ToBase64String(cipher);
        }
        catch (Exception ex)
        {
            // If DPAPI is unavailable we fall back to the legacy plaintext form rather than
            // lose the session entirely; the next successful save will protect it.
            LogCrash(ex);
            return plain;
        }
    }

    private static string UnprotectToken(string stored)
    {
        if (string.IsNullOrEmpty(stored)) return "";
        if (!stored.StartsWith("enc:", StringComparison.Ordinal)) return stored; // legacy plaintext
        try
        {
            byte[] plain = System.Security.Cryptography.ProtectedData.Unprotect(
                Convert.FromBase64String(stored.Substring(4)), null, System.Security.Cryptography.DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(plain);
        }
        catch (Exception ex)
        {
            LogCrash(ex);
            return "";
        }
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
        return JsonValue(json, key) as string ?? "";
    }

    private static bool JsonBool(string json, string key)
    {
        object value = JsonValue(json, key);
        return value is bool && (bool)value;
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
                backgroundProfile = LoadProfileSettingsFromSite();
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

    // Lists "Auto" + every connected display so the user can pin capture to one screen.
    private void PopulateMonitorBox()
    {
        if (monitorBox == null) return;
        updatingMonitorUi = true;
        try
        {
            monitorBox.Items.Clear();
            monitorBox.Items.Add(T("captureMonitorAuto"));
            Screen[] screens = Screen.AllScreens;
            for (int i = 0; i < screens.Length; i++)
            {
                Rectangle b = screens[i].Bounds;
                monitorBox.Items.Add(T("captureMonitor") + " " + (i + 1) + " - " + b.Width + "x" + b.Height + (screens[i].Primary ? " *" : ""));
            }
            int sel = (captureMonitorIndex >= 0 && captureMonitorIndex < screens.Length) ? captureMonitorIndex + 1 : 0;
            if (sel >= monitorBox.Items.Count) sel = 0;
            monitorBox.SelectedIndex = sel;
        }
        finally
        {
            updatingMonitorUi = false;
        }
    }

    private void OnMonitorSelected()
    {
        if (updatingMonitorUi || monitorBox == null) return;
        captureMonitorIndex = monitorBox.SelectedIndex - 1; // index 0 = Auto -> -1
        if (captureMonitorIndex < -1) captureMonitorIndex = -1;
        SaveSession();
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
                + " --monitor " + captureMonitorIndex
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
        blackFrameWarned = false;
        displayCaptureMode = 0; // re-probe ddagrab availability for this session
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
            RefreshScoreboardJournal();
            ShowToast(EndGameToastText(line), 4500, CapturedScreen(), true);
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
        else if (line.Contains("Scoreboard read") || line.Contains("Scoreboard detected"))
        {
            // The engine has the end-game summary on screen and is reading it: tell the user
            // it saw and captured the scoreboard, before the upload confirmation lands.
            statusLabel.Text = T("scoreboardSeen");
            statusLabel.ForeColor = theme.Info;
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

    private sealed class ScoreboardCaptureItem
    {
        public string PathValue;
        public string LabelValue;

        public override string ToString()
        {
            return LabelValue;
        }
    }

    private string ScoreboardDebugDir()
    {
        return Path.Combine(sessionDir, "debug");
    }

    private static bool IsSupportedImageFile(string path)
    {
        string ext = System.IO.Path.GetExtension(path).ToLowerInvariant();
        return ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".bmp";
    }

    private static string SafeFileNamePart(string value)
    {
        string name = string.IsNullOrWhiteSpace(value) ? "capture" : value;
        foreach (char c in System.IO.Path.GetInvalidFileNameChars()) name = name.Replace(c, '-');
        return name.Trim();
    }

    private void RefreshScoreboardJournal()
    {
        if (historyList == null) return;
        ScoreboardCaptureItem selectedItem = historyList.SelectedItem as ScoreboardCaptureItem;
        string selectedPath = selectedItem == null ? null : selectedItem.PathValue;
        historyList.BeginUpdate();
        try
        {
            historyList.Items.Clear();
            string dir = ScoreboardDebugDir();
            if (!Directory.Exists(dir))
            {
                historyList.Items.Add(T("importEmpty"));
                return;
            }

            var files = new List<FileInfo>();
            foreach (string file in Directory.GetFiles(dir))
            {
                if (!IsSupportedImageFile(file)) continue;
                var info = new FileInfo(file);
                if (info.LastWriteTime.Date == DateTime.Today) files.Add(info);
            }
            files.Sort(delegate(FileInfo a, FileInfo b) { return b.LastWriteTime.CompareTo(a.LastWriteTime); });

            if (files.Count == 0)
            {
                historyList.Items.Add(T("importEmpty"));
                return;
            }

            int selectedIndex = -1;
            for (int i = 0; i < files.Count; i++)
            {
                FileInfo file = files[i];
                bool manual = file.Name.StartsWith("manual_", StringComparison.OrdinalIgnoreCase);
                var item = new ScoreboardCaptureItem
                {
                    PathValue = file.FullName,
                    LabelValue = file.LastWriteTime.ToString("HH:mm") + "  " + (manual ? "MANUEL" : "APP") + "  " + file.Name
                };
                historyList.Items.Add(item);
                if (selectedPath != null && string.Equals(selectedPath, file.FullName, StringComparison.OrdinalIgnoreCase)) selectedIndex = i;
            }
            if (selectedIndex >= 0) historyList.SelectedIndex = selectedIndex;
        }
        finally
        {
            historyList.EndUpdate();
        }
    }

    private void AddManualScoreboardCapture()
    {
        using (var dialog = new OpenFileDialog())
        {
            dialog.Title = T("importAdd");
            dialog.Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|All files (*.*)|*.*";
            dialog.Multiselect = true;
            if (dialog.ShowDialog(this) != DialogResult.OK) return;

            try
            {
                string dir = ScoreboardDebugDir();
                Directory.CreateDirectory(dir);
                foreach (string source in dialog.FileNames)
                {
                    if (!File.Exists(source) || !IsSupportedImageFile(source)) continue;
                    string ext = System.IO.Path.GetExtension(source).ToLowerInvariant();
                    string name = SafeFileNamePart(System.IO.Path.GetFileNameWithoutExtension(source));
                    string stamp = DateTime.Now.ToString("yyyy-MM-ddTHH-mm-ss-fff");
                    string target = System.IO.Path.Combine(dir, "manual_" + stamp + "_" + name + ext);
                    File.Copy(source, target, false);
                }
                RefreshScoreboardJournal();
                AddLogLine(T("manualImportAdded"));
            }
            catch (Exception ex)
            {
                AddLogLine(T("manualImportFailed") + ex.Message);
            }
        }
    }

    private void OpenSelectedScoreboardCapture()
    {
        var item = historyList == null ? null : historyList.SelectedItem as ScoreboardCaptureItem;
        if (item == null || string.IsNullOrWhiteSpace(item.PathValue) || !File.Exists(item.PathValue)) return;
        OpenUrl(item.PathValue);
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
