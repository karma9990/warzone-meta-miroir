using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Text;
using System.IO;
using System.Net;
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
    private readonly PrivateFontCollection appFonts = new PrivateFontCollection();
    private FontFamily displayFontFamily;

    private Process companionProcess;
    private NotifyIcon tray;
    private Timer outputTimer;
    private Timer loginPollTimer;
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
    private Label importsLabel;
    private Label journalLabel;
    private Panel sidebarPanel;
    private Panel mainPanel;
    private Panel welcomePanel;
    private Panel welcomeLoginPanel;
    private Panel freeInfoCard;
    private Panel freeConnectionCard;
    private Panel freeControlsCard;
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
    private Button startButton;
    private Button stopButton;
    private CheckBox highlightsToggle;
    private ComboBox languageBox;
    private ComboBox welcomeLanguageBox;
    private NumericUpDown pollBox;
    private ListBox historyList;
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
    private bool highlightsProEnabled;
    private bool updatingLanguageUi;
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

        LoadAppFonts();
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
    }

    private void LoadAppFonts()
    {
        string bundledFont = Path.Combine(root, "app", "bisou-expanded.otf");
        string sourceFont = Path.Combine(root, "font", "bisou-font", "copyrightbolditalicstudio-bisouexpandedtrial.otf");
        string fontPath = File.Exists(bundledFont) ? bundledFont : sourceFont;
        if (!File.Exists(fontPath)) return;
        try
        {
            appFonts.AddFontFile(fontPath);
            if (appFonts.Families.Length > 0) displayFontFamily = appFonts.Families[0];
        }
        catch
        {
            displayFontFamily = null;
        }
    }

    private Font AppFont(float size, FontStyle style)
    {
        if (displayFontFamily != null) return new Font(displayFontFamily, size, style);
        return new Font("Consolas", size, style);
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
        Size = new Size(900, 640);
        MinimumSize = new Size(820, 600);
        StartPosition = FormStartPosition.CenterScreen;
        Font = AppFont(9, FontStyle.Regular);

        welcomePanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(900, 640),
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

        welcomeTitleLabel = Label("", 78, 210, 460, 150, 22, FontStyle.Bold, Color.White);
        welcomePanel.Controls.Add(welcomeTitleLabel);

        welcomeSubtitleLabel = Label("", 78, 350, 430, 70, 12, FontStyle.Regular, Color.White);
        welcomeSubtitleLabel.Visible = false;
        welcomePanel.Controls.Add(welcomeSubtitleLabel);

        welcomeStatsLabel = Label("", 78, 470, 430, 58, 10, FontStyle.Bold, Color.White);
        welcomePanel.Controls.Add(welcomeStatsLabel);

        welcomeLoginPanel = new Panel
        {
            Location = new Point(586, 156),
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
            Size = new Size(220, 640),
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left
        };
        Controls.Add(sidebarPanel);

        mainPanel = new Panel
        {
            Location = new Point(220, 0),
            Size = new Size(680, 640),
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
            Location = new Point(420, 26),
            Size = new Size(88, 28),
            Font = AppFont(8, FontStyle.Bold)
        };
        languageBox.Items.AddRange(new object[] { "FR", "EN", "ES" });
        languageBox.SelectedIndexChanged += delegate { OnLanguageChanged(); };
        mainPanel.Controls.Add(languageBox);

        themeButton = Button("MODE CLAIR", 528, 24, 116, 28, Color.FromArgb(22, 60, 255));
        themeButton.Click += delegate { ToggleTheme(); };
        mainPanel.Controls.Add(themeButton);

        freeInfoCard = new Panel
        {
            Location = new Point(34, 92),
            Size = new Size(596, 126),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(freeInfoCard);

        freePageTitleLabel = Label("", 24, 22, 420, 32, 16, FontStyle.Bold, Color.White);
        freeInfoCard.Controls.Add(freePageTitleLabel);

        freePageDescLabel = Label("", 24, 64, 540, 42, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        freeInfoCard.Controls.Add(freePageDescLabel);

        freeConnectionCard = new Panel
        {
            Location = new Point(34, 238),
            Size = new Size(596, 106),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(freeConnectionCard);

        statusLabel = Label("", 24, 18, 260, 24, 10, FontStyle.Bold, Color.FromArgb(185, 185, 185));
        freeConnectionCard.Controls.Add(statusLabel);

        connectionLabel = Label("", 24, 58, 300, 24, 9, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        freeConnectionCard.Controls.Add(connectionLabel);

        connectButton = Button("", 360, 34, 206, 38, Color.FromArgb(22, 60, 255));
        connectButton.Click += async delegate { await StartLoginFlow(); };
        freeConnectionCard.Controls.Add(connectButton);

        freeControlsCard = new Panel
        {
            Location = new Point(34, 364),
            Size = new Size(596, 112),
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

        startButton = Button("", 390, 14, 82, 34, Color.FromArgb(22, 60, 255));
        startButton.Click += delegate { StartCompanion(); };
        freeControlsCard.Controls.Add(startButton);

        stopButton = Button("", 486, 14, 82, 34, Color.FromArgb(42, 42, 48));
        stopButton.Enabled = false;
        stopButton.Click += delegate { StopCompanion(); };
        freeControlsCard.Controls.Add(stopButton);

        hintLabel = Label("", 24, 66, 540, 34, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        freeControlsCard.Controls.Add(hintLabel);

        premiumPageTitleLabel = Label("", 34, 112, 420, 32, 16, FontStyle.Bold, Color.White);
        mainPanel.Controls.Add(premiumPageTitleLabel);

        premiumPageDescLabel = Label("", 34, 150, 590, 42, 8, FontStyle.Regular, Color.FromArgb(185, 185, 185));
        mainPanel.Controls.Add(premiumPageDescLabel);

        highlightsTitleLabel = Label("", 34, 220, 210, 22, 10, FontStyle.Bold, Color.White);
        mainPanel.Controls.Add(highlightsTitleLabel);

        highlightsToggle = new CheckBox
        {
            Location = new Point(360, 216),
            Size = new Size(278, 28),
            FlatStyle = FlatStyle.Flat,
            Font = AppFont(8, FontStyle.Bold),
            ForeColor = Color.White
        };
        highlightsToggle.CheckedChanged += delegate { OnHighlightsChanged(); };
        mainPanel.Controls.Add(highlightsToggle);

        highlightsDescLabel = Label("", 34, 260, 590, 54, 8, FontStyle.Regular, Color.FromArgb(150, 150, 155));
        mainPanel.Controls.Add(highlightsDescLabel);

        highlightsStatusLabel = Label("", 34, 306, 590, 44, 8, FontStyle.Bold, Color.FromArgb(255, 204, 0));
        mainPanel.Controls.Add(highlightsStatusLabel);

        importsLabel = Label("", 34, 492, 160, 20, 9, FontStyle.Bold, Color.White);
        mainPanel.Controls.Add(importsLabel);
        historyList = new ListBox
        {
            Location = new Point(34, 516),
            Size = new Size(290, 56),
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        mainPanel.Controls.Add(historyList);

        journalLabel = Label("", 348, 492, 160, 20, 9, FontStyle.Bold, Color.White);
        mainPanel.Controls.Add(journalLabel);
        logBox = new TextBox
        {
            Location = new Point(348, 516),
            Size = new Size(290, 56),
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            ReadOnly = true,
            BackColor = Color.FromArgb(4, 4, 6),
            ForeColor = Color.FromArgb(220, 220, 225),
            Font = new Font("Consolas", 8, FontStyle.Regular),
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
            Font = new Font("Consolas", size, style),
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
            Font = new Font("Consolas", 8, FontStyle.Bold)
        };
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = color;
        button.FlatAppearance.MouseOverBackColor = color;
        button.FlatAppearance.MouseDownBackColor = ControlPaint.Dark(color);
        return button;
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
                case "highlightsDesc": return "Paid module planned: keep a rolling game buffer, save only kill/death moments, then build a best-of at the end of each game.";
                case "highlightsStatusOn": return "Queued for Pro access. Recording will stay inactive until the paid module is released.";
                case "highlightsStatusOff": return "Optional paid add-on. Free tracking keeps working without it.";
                case "highlightsQueued": return "Highlights Pro option is selected. Video capture is a paid module and is not active in this build.";
                case "imports": return "Imports";
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
                case "minimizeNotice": return "WZprometa is minimized to the tray.";
                case "minimizeBody": return "The app can keep running in the background. You can also quit the application completely.";
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
                case "profileGuest": return "No conectado";
                case "goSettings": return "Ir a ajustes";
                case "logout": return "Cerrar sesion";
                case "welcomeKicker": return "ENTRA EN WZPRO";
                case "welcomeTitle": return "WZPRO COMPANION TRACKTEA TUS STATS DE PARTIDA";
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
                case "highlightsDesc": return "Modulo de pago previsto: buffer de partida, guarda solo kills/muertes y crea un best-of al final de cada partida.";
                case "highlightsStatusOn": return "Preparado para acceso Pro. La grabacion queda inactiva hasta publicar el modulo de pago.";
                case "highlightsStatusOff": return "Add-on de pago opcional. El tracking gratis sigue funcionando sin el.";
                case "highlightsQueued": return "Highlights Pro esta seleccionado. La captura de video es de pago y no esta activa en esta build.";
                case "imports": return "Importaciones";
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
                case "minimizeNotice": return "WZprometa esta minimizado en la bandeja.";
                case "minimizeBody": return "La app puede seguir funcionando en segundo plano. Tambien puedes cerrarla totalmente.";
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
            case "highlightsDesc": return "Module payant prevu: buffer de game, sauvegarde seulement les kills/morts, puis genere un best-of a la fin de chaque partie.";
            case "highlightsStatusOn": return "Prepare pour l acces Pro. L enregistrement reste inactif tant que le module payant n est pas publie.";
            case "highlightsStatusOff": return "Option payante non obligatoire. Le tracking gratuit continue sans elle.";
            case "highlightsQueued": return "Option Highlights Pro selectionnee. La capture video est payante et inactive dans cette build.";
            case "imports": return "Imports";
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
            case "minimizeNotice": return "WZprometa est reduit dans les applications.";
            case "minimizeBody": return "L app peut continuer en arriere-plan. Tu peux aussi fermer totalement l application.";
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
        activePage = page == "premium" ? "premium" : "free";
        bool premium = activePage == "premium";

        if (freeInfoCard != null) freeInfoCard.Visible = !premium;
        if (freeConnectionCard != null) freeConnectionCard.Visible = !premium;
        if (freeControlsCard != null) freeControlsCard.Visible = !premium;
        importsLabel.Visible = !premium;
        historyList.Visible = !premium;
        journalLabel.Visible = !premium;
        logBox.Visible = !premium;

        highlightsTitleLabel.Visible = premium;
        premiumPageTitleLabel.Visible = premium;
        premiumPageDescLabel.Visible = premium;
        highlightsToggle.Visible = premium;
        highlightsDescLabel.Visible = false;
        highlightsStatusLabel.Visible = premium;

        StylePageButtons(Theme);
    }

    private void OnHighlightsChanged()
    {
        highlightsProEnabled = highlightsToggle.Checked;
        highlightsStatusLabel.Text = highlightsProEnabled ? T("highlightsStatusOn") : T("highlightsStatusOff");
        highlightsStatusLabel.ForeColor = highlightsProEnabled ? Theme.Warn : Theme.Muted;
        SaveSession();
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
        Text = "WZPRO Companion";
        titleLabel.Text = T("title");
        leadLabel.Text = T("lead");
        freeAccessButton.Text = T("freeAccess");
        premiumButton.Text = T("premiumAccess");
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
        highlightsDescLabel.Text = T("highlightsDesc");
        highlightsStatusLabel.Text = highlightsProEnabled ? T("highlightsStatusOn") : T("highlightsStatusOff");
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
        importsLabel.ForeColor = theme.Blue;
        journalLabel.ForeColor = theme.Blue;

        StylePrimaryButton(connectButton, theme);
        StylePrimaryButton(welcomeConnectButton, theme);
        StyleSecondaryButton(welcomeSiteButton, theme);
        StylePrimaryButton(startButton, theme);
        StyleSecondaryButton(stopButton, theme);
        StyleSecondaryButton(themeButton, theme);
        StyleComboBox(languageBox, theme);
        StyleCheckBox(highlightsToggle, theme);
        StylePageButtons(theme);
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
            profilePictureUrl = ExtractLine(text, "profilePicture");
            string savedTheme = ExtractLine(text, "theme");
            if (savedTheme == "light" || savedTheme == "dark") themeMode = savedTheme;
            string savedLanguage = ExtractLine(text, "language");
            if (savedLanguage == "fr" || savedLanguage == "en" || savedLanguage == "es") languageCode = savedLanguage;
            highlightsProEnabled = ExtractLine(text, "highlightsPro") == "1";
            if (highlightsToggle != null) highlightsToggle.Checked = highlightsProEnabled;
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
        File.WriteAllText(sessionPath, "site=" + site + Environment.NewLine + "token=" + deviceToken + Environment.NewLine + "userName=" + connectedName + Environment.NewLine + "profilePicture=" + profilePictureUrl + Environment.NewLine + "theme=" + themeMode + Environment.NewLine + "language=" + languageCode + Environment.NewLine + "highlightsPro=" + (highlightsProEnabled ? "1" : "0"), Encoding.UTF8);
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
        if (highlightsProEnabled) AddLogLine(T("highlightsQueued"));

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
        companionProcess.Exited += delegate { pendingLines.Enqueue(T("stopped")); };
        companionProcess.Start();
        companionProcess.BeginOutputReadLine();
        companionProcess.BeginErrorReadLine();
        SetRunningState(true);
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
        logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + line + Environment.NewLine);
        if (line.Contains("Uploaded game"))
        {
            historyCount++;
            historyList.Items.Insert(0, T("gamePrefix") + historyCount + " - " + line);
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
