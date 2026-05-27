# ================================================================
#  WZ PRO - GAMING OPTIMIZER  (WPF GUI)
#  irm https://gist.githubusercontent.com/karma9990/47600a085998db236d27610204b934e3/raw/gaming-optimizer.ps1 | iex
# ================================================================

param(
    [ValidateSet("Gui","Safe","Tournament","Streaming","MaxPerf","Restore","Diagnostics")]
    [string]$Mode = "Gui"
)

$script:GIST_URL = "https://gist.githubusercontent.com/karma9990/47600a085998db236d27610204b934e3/raw/gaming-optimizer.ps1"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    if ($PSCommandPath) {
        Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Mode $Mode" -Verb RunAs
    } else {
        Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -Command `"irm '$script:GIST_URL' | iex`"" -Verb RunAs
    }
    exit
}

Set-StrictMode -Off
$ErrorActionPreference = "SilentlyContinue"

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# ================================================================
#  SORTIE LOG
# ================================================================

$script:LogBox    = $null
$script:LogScroll = $null

function ws { param([string]$m)
    if ($script:LogBox) { $script:LogBox.AppendText("`n  >> $m`n"); $script:LogScroll.ScrollToEnd() }
    else { Write-Host ">> $m" }
}
function wo { param([string]$m)
    if ($script:LogBox) { $script:LogBox.AppendText("     OK  $m`n"); $script:LogScroll.ScrollToEnd() }
    else { Write-Host "   OK $m" }
}
function ww { param([string]$m)
    if ($script:LogBox) { $script:LogBox.AppendText("      !  $m`n"); $script:LogScroll.ScrollToEnd() }
    else { Write-Warning $m }
}

# ================================================================
#  LANGUES
# ================================================================

$script:strings = @{
    FR = @{
        WinTitle   = "WZ PRO  //  GAMING OPTIMIZER"
        Subtitle   = "GAMING OPTIMIZER  //  FULL PERFORMANCE BOOST"
        LegSafe    = "SAFE"; LegBehav = "COMPORTEMENT"; LegInteg = "INTEGRITE"
        LegHint    = "SURVOLEZ UNE OPTION POUR LE DETAIL"
        SelLabel   = "SELECTION :"
        BtnAll     = "TOUT COCHER"; BtnSafe = "SAFE SEULEMENT"; BtnNone = "TOUT DECOCHER"
        BtnDark    = "  MODE SOMBRE  "; BtnLight = "  MODE CLAIR  "
        BtnRun     = "  LANCER LES OPTIMISATIONS  "
        LogReady   = "SYSTEME PRET  //  Conseil : cochez quelques options, lancez, puis redemarrez. Ne cochez pas tout d un coup."
        StatusFmt  = "{0} / {1} OPTIMISATIONS SELECTIONNEES"
        MsgNoSel   = "Aucune optimisation selectionnee."
        WarnTitle  = "AVERTISSEMENT - ACTION CRITIQUE"; MsgWarnT = "Confirmation"; MsgWarnQ = "Continuer quand meme ?"
        MsgDoneT   = "Termine"; MsgDoneB = "Optimisations appliquees !`n`nRedemarrez votre PC pour finaliser tous les changements."
        LogBand    = ">> INIT  --  Creation du point de restauration..."
        LogRestore = "   OK   Point de restauration cree"
        LogResFail = "    !   Impossible (protection systeme inactive ?)"
        LogIgnore  = "    -   Ignore : "
        LogDone    = ">> TERMINE  --  Redemarrez le PC pour finaliser tous les changements."
        BtnTournoi     = "TOURNOI"; BtnStream = "STREAMING"; BtnMaxPerf = "MAX PERF"
        BtnPing        = "PING"; BtnExport = "EXPORT LOG"
        BtnMtu         = "MTU"; BtnHistory = "HISTORIQUE"
        BtnSaveProfil  = "SAVE PROFIL"; BtnLoadProfil = "LOAD PROFIL"
        BtnSessionStart= "DEBUT SESSION"; BtnSessionEnd = "FIN SESSION"
        DiagActive     = "● DEJA ACTIF"; DiagInact = "○ NON APPLIQUE"; DiagUnknown = "— INCONNU"
        RunOk          = "✓ OK"; RunErr = "✗ ERREUR"
        PingFmt        = "PING  //  {0} ms"; PingFail = "PING  //  ECHEC"
        ScoreFmt       = "SCORE  {0} / {1}  ({2}%)"
        PendingReboot  = "Un redemarrage est en attente. Certaines optimisations ne seront pas actives tant que le PC n aura pas ete redémarre."
        MsgNoProfil    = "Aucun profil sauvegarde trouve."; MsgProfilSaved = "Profil sauvegarde :"
        MsgProfilLoaded= "Profil charge :"; MsgNoHistory = "Aucun historique disponible."
        HistoryTitle   = "HISTORIQUE DES RUNS"; MtuTitle = "MTU OPTIMAL"
        StabTitle      = "STABILITE RESEAU  //  30 paquets"
        MsgAllAdviceT  = "CONSEIL D UTILISATION"
        MsgAllAdviceB  = "Conseil important : ne lancez pas tout d un coup sur un PC reel.`n`nLe bouton TOUT COCHER exclut maintenant Recovery pour eviter d annuler les optimisations dans le meme run.`n`nCochez plutot une petite serie d options, lancez, redemarrez Windows, puis testez les performances avant de continuer."
        MsgPresetFmt   = "PRESET {0} applique ({1} options)"
        MsgSessionInfo = "DEBUT SESSION`n  Applique automatiquement le preset TOURNOI :`n  plan performance, HAGS, Game Mode, profil MMCSS,`n  notifications OFF, Xbox DVR OFF et reseau conservateur.`n  Les tweaks CPU parking, timers, IPv6, interrupt moderation`n  et services permanents ne sont plus appliques par defaut.`n  Les boutons DEBUT / FIN se verrouillent pour eviter`n  les doubles applications.`n`nFIN SESSION`n  Restaure les services desactives pendant la session :`n  - SysMain (Superfetch)`n  - Windows Update`n  - Windows Search`n  - Timers / CPU parking / reseau si restauration globale choisie`n  Ton PC retrouve un comportement normal hors gaming.`n`nCONSEIL : clique DEBUT avant de lancer le jeu,`n          clique FIN quand tu as fini de jouer."
        MsgSessionEnded= "Session terminee. Services restaures."
        MsgMixedSelT   = "SELECTION INCOMPATIBLE"
        MsgMixedSelB   = "Vous avez selectionne des optimisations ET des options Recovery.`n`nRecovery annule/restaure certains reglages. Lancez Recovery seul, ou lancez les optimisations seules."
        MsgBulkT       = "CONSEIL AVANT LANCEMENT"
        MsgBulkFmt     = "Vous avez selectionne {0} optimisations.`n`nConseil : appliquez plutot quelques options, redemarrez Windows, puis testez avant de continuer. Tout lancer d un coup peut rendre le diagnostic difficile si une option pose probleme.`n`nContinuer quand meme ?"
        DiagApplied    = "● APPLIQUE"
        CliRestoreFail = "Point de restauration impossible. Continuez seulement si vous avez un backup/snapshot VM."
        CliUnknownOpt  = "Option inconnue ignoree: {0}"
        CliOptErrorFmt = "Erreur sur {0} : {1}"
        CliDone        = "Termine. Redemarrez Windows avant de mesurer les performances."
        HistoryCountFmt= "{0}  //  {1} optimisations"
        MtuResultFmt   = "MTU optimal : {0} bytes`nAdaptateurs : {1}"
    }
    EN = @{
        WinTitle   = "WZ PRO  //  GAMING OPTIMIZER"
        Subtitle   = "GAMING OPTIMIZER  //  FULL PERFORMANCE BOOST"
        LegSafe    = "SAFE"; LegBehav = "BEHAVIOR"; LegInteg = "INTEGRITY"
        LegHint    = "HOVER AN OPTION FOR DETAILS"
        SelLabel   = "SELECTION :"
        BtnAll     = "CHECK ALL"; BtnSafe = "SAFE ONLY"; BtnNone = "UNCHECK ALL"
        BtnDark    = "  DARK MODE  "; BtnLight = "  LIGHT MODE  "
        BtnRun     = "  RUN OPTIMIZATIONS  "
        LogReady   = "SYSTEM READY  //  Advice: select a few options, run, then reboot. Do not check everything at once."
        StatusFmt  = "{0} / {1} OPTIMIZATIONS SELECTED"
        MsgNoSel   = "No optimization selected."
        WarnTitle  = "WARNING - CRITICAL ACTION"; MsgWarnT = "Confirmation"; MsgWarnQ = "Continue anyway?"
        MsgDoneT   = "Done"; MsgDoneB = "Optimizations applied!`n`nRestart your PC to finalize all changes."
        LogBand    = ">> INIT  --  Creating restore point..."
        LogRestore = "   OK   Restore point created"
        LogResFail = "    !   Failed (system protection inactive?)"
        LogIgnore  = "    -   Skipped : "
        LogDone    = ">> DONE  --  Restart your PC to finalize all changes."
        BtnTournoi     = "TOURNAMENT"; BtnStream = "STREAMING"; BtnMaxPerf = "MAX PERF"
        BtnPing        = "PING"; BtnExport = "EXPORT LOG"
        BtnMtu         = "MTU"; BtnHistory = "HISTORY"
        BtnSaveProfil  = "SAVE PROFILE"; BtnLoadProfil = "LOAD PROFILE"
        BtnSessionStart= "START SESSION"; BtnSessionEnd = "END SESSION"
        DiagActive     = "● ALREADY ACTIVE"; DiagInact = "○ NOT APPLIED"; DiagUnknown = "— UNKNOWN"
        RunOk          = "✓ OK"; RunErr = "✗ ERROR"
        PingFmt        = "PING  //  {0} ms"; PingFail = "PING  //  FAILED"
        ScoreFmt       = "SCORE  {0} / {1}  ({2}%)"
        PendingReboot  = "A reboot is pending. Some optimizations will not be active until the PC has been restarted."
        MsgNoProfil    = "No saved profile found."; MsgProfilSaved = "Profile saved:"
        MsgProfilLoaded= "Profile loaded:"; MsgNoHistory = "No history available."
        HistoryTitle   = "RUN HISTORY"; MtuTitle = "OPTIMAL MTU"
        StabTitle      = "NETWORK STABILITY  //  30 packets"
        MsgAllAdviceT  = "USAGE ADVICE"
        MsgAllAdviceB  = "Important advice: do not run everything at once on a real PC.`n`nThe CHECK ALL button now excludes Recovery to avoid undoing optimizations in the same run.`n`nSelect a small set of options, run them, restart Windows, then test performance before continuing."
        MsgPresetFmt   = "PRESET {0} applied ({1} options)"
        MsgSessionInfo = "START SESSION`n  Automatically applies the TOURNAMENT preset:`n  performance plan, HAGS, Game Mode, MMCSS profile,`n  notifications OFF, Xbox DVR OFF and conservative network tweaks.`n  CPU parking, timers, IPv6, interrupt moderation`n  and permanent service tweaks are no longer applied by default.`n  START / END buttons lock to avoid duplicate applications.`n`nEND SESSION`n  Restores services disabled during the session:`n  - SysMain (Superfetch)`n  - Windows Update`n  - Windows Search`n  - Timers / CPU parking / network if global restore is selected`n  Your PC returns to normal behavior outside gaming.`n`nADVICE: click START before launching the game,`n        click END when you are done playing."
        MsgSessionEnded= "Session ended. Services restored."
        MsgMixedSelT   = "INCOMPATIBLE SELECTION"
        MsgMixedSelB   = "You selected optimizations AND Recovery options.`n`nRecovery cancels/restores some settings. Run Recovery alone, or run optimizations alone."
        MsgBulkT       = "ADVICE BEFORE RUN"
        MsgBulkFmt     = "You selected {0} optimizations.`n`nAdvice: apply only a few options, restart Windows, then test before continuing. Running everything at once can make diagnostics harder if one option causes an issue.`n`nContinue anyway?"
        DiagApplied    = "● APPLIED"
        CliRestoreFail = "Could not create a restore point. Continue only if you have a backup or VM snapshot."
        CliUnknownOpt  = "Unknown option skipped: {0}"
        CliOptErrorFmt = "Error on {0}: {1}"
        CliDone        = "Done. Restart Windows before measuring performance."
        HistoryCountFmt= "{0}  //  {1} optimizations"
        MtuResultFmt   = "Optimal MTU: {0} bytes`nAdapters: {1}"
    }
    ES = @{
        WinTitle   = "WZ PRO  //  GAMING OPTIMIZER"
        Subtitle   = "GAMING OPTIMIZER  //  FULL PERFORMANCE BOOST"
        LegSafe    = "SEGURO"; LegBehav = "COMPORTAMIENTO"; LegInteg = "INTEGRIDAD"
        LegHint    = "PASE EL CURSOR PARA VER DETALLES"
        SelLabel   = "SELECCION :"
        BtnAll     = "MARCAR TODO"; BtnSafe = "SOLO SEGURO"; BtnNone = "DESMARCAR TODO"
        BtnDark    = "  MODO OSCURO  "; BtnLight = "  MODO CLARO  "
        BtnRun     = "  EJECUTAR OPTIMIZACIONES  "
        LogReady   = "SISTEMA LISTO  //  Consejo: selecciona pocas opciones, ejecuta y reinicia. No marques todo a la vez."
        StatusFmt  = "{0} / {1} OPTIMIZACIONES SELECCIONADAS"
        MsgNoSel   = "Ninguna optimizacion seleccionada."
        WarnTitle  = "ADVERTENCIA - ACCION CRITICA"; MsgWarnT = "Confirmacion"; MsgWarnQ = "Continuar de todos modos?"
        MsgDoneT   = "Completado"; MsgDoneB = "Optimizaciones aplicadas!`n`nReinicia tu PC para finalizar todos los cambios."
        LogBand    = ">> INICIO  --  Creando punto de restauracion..."
        LogRestore = "   OK   Punto de restauracion creado"
        LogResFail = "    !   Error (proteccion del sistema inactiva?)"
        LogIgnore  = "    -   Ignorado : "
        LogDone    = ">> TERMINADO  --  Reinicia tu PC para finalizar todos los cambios."
        BtnTournoi     = "TORNEO"; BtnStream = "STREAMING"; BtnMaxPerf = "MAX PERF"
        BtnPing        = "PING"; BtnExport = "EXPORTAR LOG"
        BtnMtu         = "MTU"; BtnHistory = "HISTORIAL"
        BtnSaveProfil  = "GUARDAR PERFIL"; BtnLoadProfil = "CARGAR PERFIL"
        BtnSessionStart= "INICIO SESION"; BtnSessionEnd = "FIN SESION"
        DiagActive     = "● YA ACTIVO"; DiagInact = "○ NO APLICADO"; DiagUnknown = "— DESCONOCIDO"
        RunOk          = "✓ OK"; RunErr = "✗ ERROR"
        PingFmt        = "PING  //  {0} ms"; PingFail = "PING  //  FALLO"
        ScoreFmt       = "SCORE  {0} / {1}  ({2}%)"
        PendingReboot  = "Hay un reinicio pendiente. Algunas optimizaciones no estaran activas hasta que se reinicie el PC."
        MsgNoProfil    = "No se encontro ningun perfil guardado."; MsgProfilSaved = "Perfil guardado:"
        MsgProfilLoaded= "Perfil cargado:"; MsgNoHistory = "No hay historial disponible."
        HistoryTitle   = "HISTORIAL DE EJECUCIONES"; MtuTitle = "MTU OPTIMO"
        StabTitle      = "ESTABILIDAD RED  //  30 paquetes"
        MsgAllAdviceT  = "CONSEJO DE USO"
        MsgAllAdviceB  = "Consejo importante: no ejecutes todo de una vez en un PC real.`n`nEl boton MARCAR TODO ahora excluye Recovery para evitar deshacer optimizaciones en la misma ejecucion.`n`nSelecciona un grupo pequeno de opciones, ejecuta, reinicia Windows y prueba el rendimiento antes de continuar."
        MsgPresetFmt   = "PRESET {0} aplicado ({1} opciones)"
        MsgSessionInfo = "INICIO SESION`n  Aplica automaticamente el preset TORNEO:`n  plan de rendimiento, HAGS, Game Mode, perfil MMCSS,`n  notificaciones OFF, Xbox DVR OFF y red conservadora.`n  CPU parking, timers, IPv6, interrupt moderation`n  y servicios permanentes ya no se aplican por defecto.`n  Los botones INICIO / FIN se bloquean para evitar dobles aplicaciones.`n`nFIN SESION`n  Restaura los servicios desactivados durante la sesion:`n  - SysMain (Superfetch)`n  - Windows Update`n  - Windows Search`n  - Timers / CPU parking / red si se eligio restauracion global`n  Tu PC vuelve a un comportamiento normal fuera del gaming.`n`nCONSEJO: pulsa INICIO antes de lanzar el juego,`n         pulsa FIN cuando termines de jugar."
        MsgSessionEnded= "Sesion terminada. Servicios restaurados."
        MsgMixedSelT   = "SELECCION INCOMPATIBLE"
        MsgMixedSelB   = "Has seleccionado optimizaciones Y opciones Recovery.`n`nRecovery cancela/restaura algunos ajustes. Ejecuta Recovery solo, o ejecuta las optimizaciones solas."
        MsgBulkT       = "CONSEJO ANTES DE EJECUTAR"
        MsgBulkFmt     = "Has seleccionado {0} optimizaciones.`n`nConsejo: aplica solo algunas opciones, reinicia Windows y prueba antes de continuar. Ejecutar todo de una vez puede dificultar el diagnostico si una opcion causa un problema.`n`nContinuar de todos modos?"
        DiagApplied    = "● APLICADO"
        CliRestoreFail = "No se pudo crear un punto de restauracion. Continua solo si tienes una copia de seguridad o snapshot VM."
        CliUnknownOpt  = "Opcion desconocida ignorada: {0}"
        CliOptErrorFmt = "Error en {0}: {1}"
        CliDone        = "Terminado. Reinicia Windows antes de medir el rendimiento."
        HistoryCountFmt= "{0}  //  {1} optimizaciones"
        MtuResultFmt   = "MTU optimo: {0} bytes`nAdaptadores: {1}"
    }
    DE = @{
        WinTitle   = "WZ PRO  //  GAMING OPTIMIZER"
        Subtitle   = "GAMING OPTIMIZER  //  FULL PERFORMANCE BOOST"
        LegSafe    = "SICHER"; LegBehav = "VERHALTEN"; LegInteg = "INTEGRITAET"
        LegHint    = "HOVER FUER DETAILS"
        SelLabel   = "AUSWAHL :"
        BtnAll     = "ALLE MARKIEREN"; BtnSafe = "NUR SICHER"; BtnNone = "ALLE ABWAEHLEN"
        BtnDark    = "  DUNKELMODUS  "; BtnLight = "  HELLMODUS  "
        BtnRun     = "  OPTIMIERUNGEN STARTEN  "
        LogReady   = "SYSTEM BEREIT  //  Tipp: wenige Optionen auswaehlen, starten, dann neu booten. Nicht alles gleichzeitig markieren."
        StatusFmt  = "{0} / {1} OPTIMIERUNGEN AUSGEWAEHLT"
        MsgNoSel   = "Keine Optimierung ausgewaehlt."
        WarnTitle  = "WARNUNG - KRITISCHE AKTION"; MsgWarnT = "Bestaetigung"; MsgWarnQ = "Trotzdem fortfahren?"
        MsgDoneT   = "Fertig"; MsgDoneB = "Optimierungen angewendet!`n`nStarten Sie Ihren PC neu um alle Aenderungen abzuschliessen."
        LogBand    = ">> INIT  --  Wiederherstellungspunkt erstellen..."
        LogRestore = "   OK   Wiederherstellungspunkt erstellt"
        LogResFail = "    !   Fehler (Systemschutz inaktiv?)"
        LogIgnore  = "    -   Uebersprungen : "
        LogDone    = ">> FERTIG  --  Starten Sie Ihren PC neu um alle Aenderungen abzuschliessen."
        BtnTournoi     = "TURNIER"; BtnStream = "STREAMING"; BtnMaxPerf = "MAX PERF"
        BtnPing        = "PING"; BtnExport = "LOG EXPORT"
        BtnMtu         = "MTU"; BtnHistory = "VERLAUF"
        BtnSaveProfil  = "PROFIL SPEICHERN"; BtnLoadProfil = "PROFIL LADEN"
        BtnSessionStart= "SITZUNG STARTEN"; BtnSessionEnd = "SITZUNG BEENDEN"
        DiagActive     = "● BEREITS AKTIV"; DiagInact = "○ NICHT ANGEWENDET"; DiagUnknown = "— UNBEKANNT"
        RunOk          = "✓ OK"; RunErr = "✗ FEHLER"
        PingFmt        = "PING  //  {0} ms"; PingFail = "PING  //  FEHLGESCHLAGEN"
        ScoreFmt       = "SCORE  {0} / {1}  ({2}%)"
        PendingReboot  = "Ein Neustart steht aus. Einige Optimierungen werden erst nach dem Neustart aktiv."
        MsgNoProfil    = "Kein gespeichertes Profil gefunden."; MsgProfilSaved = "Profil gespeichert:"
        MsgProfilLoaded= "Profil geladen:"; MsgNoHistory = "Kein Verlauf verfuegbar."
        HistoryTitle   = "AUSFUEHRUNGSVERLAUF"; MtuTitle = "OPTIMALE MTU"
        StabTitle      = "NETZWERKSTABILITAET  //  30 Pakete"
        MsgAllAdviceT  = "NUTZUNGSHINWEIS"
        MsgAllAdviceB  = "Wichtiger Hinweis: nicht alles gleichzeitig auf einem echten PC ausfuehren.`n`nALLE MARKIEREN schliesst Recovery jetzt aus, damit Optimierungen im selben Lauf nicht rueckgaengig gemacht werden.`n`nWaehlen Sie eine kleine Gruppe von Optionen, starten Sie diese, booten Sie Windows neu und testen Sie die Leistung, bevor Sie fortfahren."
        MsgPresetFmt   = "PRESET {0} angewendet ({1} Optionen)"
        MsgSessionInfo = "SITZUNG STARTEN`n  Wendet automatisch das TURNIER-Preset an:`n  Leistungsplan, HAGS, Game Mode, MMCSS-Profil,`n  Benachrichtigungen OFF, Xbox DVR OFF und konservative Netzwerk-Tweaks.`n  CPU-Parking, Timer, IPv6, Interrupt Moderation`n  und permanente Dienst-Tweaks werden standardmaessig nicht mehr angewendet.`n  START / ENDE Buttons werden gesperrt, um doppelte Anwendungen zu vermeiden.`n`nSITZUNG BEENDEN`n  Stellt waehrend der Sitzung deaktivierte Dienste wieder her:`n  - SysMain (Superfetch)`n  - Windows Update`n  - Windows Search`n  - Timer / CPU-Parking / Netzwerk, falls globale Wiederherstellung gewaehlt wurde`n  Ihr PC verhaelt sich ausserhalb des Gamings wieder normal.`n`nTIPP: START vor dem Spielstart klicken,`n      ENDE klicken, wenn Sie fertig sind."
        MsgSessionEnded= "Sitzung beendet. Dienste wiederhergestellt."
        MsgMixedSelT   = "INKOMPATIBLE AUSWAHL"
        MsgMixedSelB   = "Sie haben Optimierungen UND Recovery-Optionen ausgewaehlt.`n`nRecovery macht einige Einstellungen rueckgaengig oder stellt sie wieder her. Fuehren Sie Recovery allein aus, oder fuehren Sie nur Optimierungen aus."
        MsgBulkT       = "HINWEIS VOR DEM START"
        MsgBulkFmt     = "Sie haben {0} Optimierungen ausgewaehlt.`n`nTipp: wenden Sie nur wenige Optionen an, starten Sie Windows neu und testen Sie danach. Alles auf einmal auszufuehren kann die Diagnose erschweren, falls eine Option Probleme verursacht.`n`nTrotzdem fortfahren?"
        DiagApplied    = "● ANGEWENDET"
        CliRestoreFail = "Wiederherstellungspunkt konnte nicht erstellt werden. Nur fortfahren, wenn Sie ein Backup oder einen VM-Snapshot haben."
        CliUnknownOpt  = "Unbekannte Option uebersprungen: {0}"
        CliOptErrorFmt = "Fehler bei {0}: {1}"
        CliDone        = "Fertig. Starten Sie Windows neu, bevor Sie die Leistung messen."
        HistoryCountFmt= "{0}  //  {1} Optimierungen"
        MtuResultFmt   = "Optimale MTU: {0} bytes`nAdapter: {1}"
    }
}

$script:groupLangNames = @{
    "Systeme"       = @{ FR="Systeme";    EN="System";    ES="Sistema";   DE="System" }
    "GPU / Drivers" = @{ FR="GPU / Drivers"; EN="GPU / Drivers"; ES="GPU / Drivers"; DE="GPU / Treiber" }
    "Reseau"        = @{ FR="Reseau";     EN="Network";   ES="Red";       DE="Netzwerk" }
    "Interface"     = @{ FR="Interface";  EN="Interface"; ES="Interfaz";  DE="Oberflaeche" }
    "Services"      = @{ FR="Services";   EN="Services";  ES="Servicios"; DE="Dienste" }
    "Gaming"        = @{ FR="Gaming";     EN="Gaming";    ES="Gaming";    DE="Gaming" }
    "Nettoyage"     = @{ FR="Nettoyage";  EN="Cleanup";   ES="Limpieza";  DE="Bereinigung" }
    "!! Avance"     = @{ FR="!! Avance";  EN="!! Advanced"; ES="!! Avanzado"; DE="!! Erweitert" }
    "Recovery"      = @{ FR="Recovery";  EN="Recovery";    ES="Recovery";   DE="Recovery" }
    "Taches"        = @{ FR="Taches";   EN="Tasks";       ES="Tareas";     DE="Aufgaben" }
}

$script:optShortLang = @{
    "A" = @{ FR="Plan Ultimate Performance";       EN="Ultimate Performance Plan";  ES="Plan Rendimiento Max";      DE="Ultimate Performance Plan" }
    "B" = @{ FR="CPU Parking desactive";           EN="CPU Parking Disabled";       ES="CPU Parking OFF";           DE="CPU-Parking deaktiviert" }
    "C" = @{ FR="SysMain / Superfetch OFF";        EN="SysMain / Superfetch OFF";   ES="SysMain / Superfetch OFF";  DE="SysMain / Superfetch OFF" }
    "D" = @{ FR="Timer + DynTick OFF";             EN="Timer + DynTick OFF";        ES="Timer + DynTick OFF";       DE="Timer + DynTick OFF" }
    "E" = @{ FR="Telemetrie + DiagTrack OFF";      EN="Telemetry + DiagTrack OFF";  ES="Telemetria + DiagTrack OFF"; DE="Telemetrie + DiagTrack OFF" }
    "F" = @{ FR="Hibernation OFF";                 EN="Hibernation OFF";            ES="Hibernacion OFF";           DE="Ruhezustand OFF" }
    "G" = @{ FR="Pagefile optimise (1x RAM)";      EN="Optimized Pagefile (1x RAM)"; ES="Pagefile optimizado (1x RAM)"; DE="Auslagerungsdatei optimiert" }
    "H" = @{ FR="Large System Cache OFF";          EN="Large System Cache OFF";     ES="Cache Sistema OFF";         DE="Large System Cache OFF" }
    "I" = @{ FR="HAGS GPU Scheduling";             EN="HAGS GPU Scheduling";        ES="HAGS Programacion GPU";     DE="HAGS GPU Scheduling" }
    "J" = @{ FR="FullScreen Optimizations OFF";    EN="FullScreen Optimizations OFF"; ES="Optimiz. Pantalla Completa OFF"; DE="Vollbildoptimierungen OFF" }
    "K" = @{ FR="MSI Mode interruptions GPU";      EN="MSI Mode GPU Interrupts";    ES="Modo MSI GPU";              DE="MSI-Modus GPU-Interrupts" }
    "L" = @{ FR="Core Isolation OFF";              EN="Core Isolation OFF";         ES="Aislamiento de nucleo OFF"; DE="Kernisolierung OFF" }
    "M" = @{ FR="Nagle off + TCP gaming";          EN="Nagle off + TCP gaming";     ES="Nagle off + TCP gaming";    DE="Nagle off + TCP gaming" }
    "N" = @{ FR="Reseau power mgmt OFF";           EN="Network Power Mgmt OFF";     ES="Gestion energia red OFF";   DE="Netzwerk Energieverwaltung OFF" }
    "O" = @{ FR="QoS OFF (100% bandwidth)";        EN="QoS OFF (100% bandwidth)";   ES="QoS OFF (100% ancho)";      DE="QoS OFF (100% Bandbreite)" }
    "P" = @{ FR="Flush DNS + Winsock reset";       EN="Flush DNS + Winsock reset";  ES="Flush DNS + reset Winsock"; DE="DNS leeren + Winsock reset" }
    "Q" = @{ FR="Effets visuels OFF";              EN="Visual Effects OFF";         ES="Efectos visuales OFF";      DE="Visuelle Effekte OFF" }
    "R" = @{ FR="Xbox Game Bar + DVR OFF";         EN="Xbox Game Bar + DVR OFF";    ES="Xbox Game Bar + DVR OFF";   DE="Xbox Game Bar + DVR OFF" }
    "S" = @{ FR="Notifications OFF";              EN="Notifications OFF";          ES="Notificaciones OFF";        DE="Benachrichtigungen OFF" }
    "T" = @{ FR="Cortana desactive";               EN="Cortana Disabled";           ES="Cortana desactivado";       DE="Cortana deaktiviert" }
    "U" = @{ FR="Pointer Precision OFF (raw)";     EN="Pointer Precision OFF (raw)"; ES="Precision puntero OFF";    DE="Zeigergenauigkeit OFF" }
    "V" = @{ FR="Transparence + Animations OFF";   EN="Transparency + Animations OFF"; ES="Transparencia + Anim OFF"; DE="Transparenz + Animationen OFF" }
    "W" = @{ FR="Windows Search OFF";              EN="Windows Search OFF";         ES="Busqueda Windows OFF";      DE="Windows Suche OFF" }
    "X" = @{ FR="Background Apps UWP OFF";         EN="Background Apps UWP OFF";    ES="Apps fondo UWP OFF";        DE="Hintergrund-Apps UWP OFF" }
    "Y" = @{ FR="Services non-essentiels OFF";     EN="Non-Essential Services OFF"; ES="Servicios no esenciales OFF"; DE="Nicht-wesentliche Dienste OFF" }
    "Z" = @{ FR="Windows Update OFF (session)";    EN="Windows Update OFF (session)"; ES="Windows Update OFF (sesion)"; DE="Windows Update OFF (Sitzung)" }
    "1" = @{ FR="Game Mode Windows active";        EN="Windows Game Mode ON";       ES="Modo Juego Windows activo"; DE="Windows Spielmodus aktiv" }
    "2" = @{ FR="MMCSS Gaming Profile";            EN="MMCSS Gaming Profile";       ES="Perfil Gaming MMCSS";       DE="MMCSS Gaming Profil" }
    "3" = @{ FR="CPU + IO Priority (COD/WZ/BO6)";  EN="CPU + IO Priority (COD/WZ/BO6)"; ES="Prioridad CPU + IO (COD)"; DE="CPU + IO Prioritaet (COD)" }
    "4" = @{ FR="AppCompat Shim OFF";              EN="AppCompat Shim OFF";         ES="AppCompat Shim OFF";        DE="AppCompat Shim OFF" }
    "5" = @{ FR="Temp + Prefetch + Corbeille";     EN="Temp + Prefetch + Recycle Bin"; ES="Temp + Prefetch + Papelera"; DE="Temp + Prefetch + Papierkorb" }
    "6" = @{ FR="DNS + Winsock + IP renouvelee";   EN="DNS + Winsock + IP Renewed"; ES="DNS + Winsock + IP renovada"; DE="DNS + Winsock + IP erneuert" }
    "7" = @{ FR="UAC desactive";                   EN="UAC Disabled";               ES="UAC desactivado";           DE="UAC deaktiviert" }
    "8" = @{ FR="Spectre / Meltdown OFF";          EN="Spectre / Meltdown OFF";     ES="Spectre / Meltdown OFF";    DE="Spectre / Meltdown OFF" }
    "9" = @{ FR="Defender Realtime OFF";           EN="Defender Realtime OFF";      ES="Defender Tiempo Real OFF";  DE="Defender Echtzeit OFF" }
    "0"  = @{ FR="Core Isolation + VBS OFF";          EN="Core Isolation + VBS OFF";       ES="Aislamiento nucleo + VBS OFF";    DE="Kernisolierung + VBS OFF" }
    "NA" = @{ FR="DNS Gaming (1.1.1.1 Cloudflare)";  EN="DNS Gaming (1.1.1.1 Cloudflare)"; ES="DNS Gaming (1.1.1.1 Cloudflare)"; DE="Gaming DNS (1.1.1.1 Cloudflare)" }
    "NB" = @{ FR="Large Send Offload (LSO) OFF";      EN="Large Send Offload (LSO) OFF";     ES="Large Send Offload OFF";          DE="Large Send Offload (LSO) OFF" }
    "NC" = @{ FR="Interrupt Moderation OFF";          EN="Interrupt Moderation OFF";         ES="Modulacion Interrupciones OFF";   DE="Interrupt Moderation OFF" }
    "ND" = @{ FR="Network Throttling OFF";            EN="Network Throttling OFF";           ES="Throttling de red OFF";           DE="Netzwerk-Drosselung OFF" }
    "NE" = @{ FR="IPv6 desactive (adaptateurs)";      EN="IPv6 Disabled (adapters)";         ES="IPv6 desactivado (adaptadores)";  DE="IPv6 deaktiviert (Adapter)" }
    "NF" = @{ FR="Teredo + 6to4 + ISATAP OFF";        EN="Teredo + 6to4 + ISATAP OFF";       ES="Teredo + 6to4 + ISATAP OFF";      DE="Teredo + 6to4 + ISATAP OFF" }
    "NG" = @{ FR="Chimney Offload + NetDMA OFF";       EN="Chimney Offload + NetDMA OFF";     ES="Chimney Offload + NetDMA OFF";    DE="Chimney Offload + NetDMA OFF" }
    "NH" = @{ FR="NetBIOS over TCP/IP OFF";            EN="NetBIOS over TCP/IP OFF";          ES="NetBIOS sobre TCP/IP OFF";        DE="NetBIOS ueber TCP/IP OFF" }
    "NI" = @{ FR="DefaultTTL + TCP params avances";   EN="DefaultTTL + Advanced TCP params"; ES="DefaultTTL + params TCP avanzados"; DE="DefaultTTL + erweiterte TCP-Param" }
    "NJ"  = @{ FR="Packet Coalescing OFF + RSS ON";         EN="Packet Coalescing OFF + RSS ON";      ES="Coalescencia paquetes OFF + RSS";     DE="Paket-Koaleszenz OFF + RSS AN" }
    "RCA" = @{ FR="Plan Balanced (defaut Windows)";        EN="Balanced Plan (Windows default)";     ES="Plan Equilibrado (defecto Windows)";   DE="Balanced-Plan (Windows Standard)" }
    "RCB" = @{ FR="SysMain / Superfetch ON";               EN="SysMain / Superfetch ON";             ES="SysMain / Superfetch ON";              DE="SysMain / Superfetch AN" }
    "RCC" = @{ FR="Windows Update reactive";               EN="Windows Update Restored";             ES="Windows Update restaurado";            DE="Windows Update reaktiviert" }
    "RCD" = @{ FR="Hibernation reactive";                  EN="Hibernation Restored";                ES="Hibernacion restaurada";               DE="Ruhezustand reaktiviert" }
    "RCE" = @{ FR="IPv6 reactive (adaptateurs)";           EN="IPv6 Restored (adapters)";            ES="IPv6 restaurado (adaptadores)";        DE="IPv6 reaktiviert (Adapter)" }
    "RCF" = @{ FR="DNS automatique (DHCP)";                EN="Automatic DNS (DHCP)";                ES="DNS automatico (DHCP)";                DE="Automatisches DNS (DHCP)" }
    "RCG" = @{ FR="Xbox Game Bar + DVR reactive";          EN="Xbox Game Bar + DVR Restored";        ES="Xbox Game Bar + DVR restaurado";       DE="Xbox Game Bar + DVR reaktiviert" }
    "RCH" = @{ FR="Windows Defender Realtime ON";          EN="Windows Defender Realtime ON";        ES="Windows Defender Tiempo Real ON";      DE="Windows Defender Echtzeit AN" }
    "RCI" = @{ FR="UAC reactive";                          EN="UAC Restored";                        ES="UAC restaurado";                       DE="UAC reaktiviert" }
    "RCJ" = @{ FR="Windows Search reactive";               EN="Windows Search Restored";             ES="Busqueda Windows restaurada";          DE="Windows Suche reaktiviert" }
    "RCK" = @{ FR="Cortana reactive";                      EN="Cortana Restored";                    ES="Cortana restaurado";                   DE="Cortana reaktiviert" }
    "RCL" = @{ FR="Notifications reactives";               EN="Notifications Restored";              ES="Notificaciones restauradas";           DE="Benachrichtigungen reaktiviert" }
    "RCM" = @{ FR="Effets visuels + Animations ON";        EN="Visual Effects + Animations ON";      ES="Efectos visuales + Animaciones ON";    DE="Visuelle Effekte + Animationen AN" }
    "RCN" = @{ FR="Background Apps UWP ON";                EN="Background Apps UWP ON";              ES="Apps segundo plano UWP ON";            DE="Hintergrund-Apps UWP AN" }
    "RCO" = @{ FR="Network Throttling ON (defaut)";        EN="Network Throttling ON (default)";     ES="Throttling red ON (defecto)";          DE="Netzwerkdrosselung AN (Standard)" }
    "RCP" = @{ FR="Reset TCP/IP + Winsock complet";        EN="Full TCP/IP + Winsock Reset";         ES="Reset TCP/IP + Winsock completo";      DE="Vollstaendiger TCP/IP + Winsock Reset" }
    "RCS" = @{ FR="Services non-essentiels ON";            EN="Non-Essential Services ON";            ES="Servicios no esenciales ON";           DE="Nicht-wesentliche Dienste AN" }
    "RCT" = @{ FR="Telemetrie + DiagTrack ON";             EN="Telemetry + DiagTrack ON";             ES="Telemetria + DiagTrack ON";            DE="Telemetrie + DiagTrack AN" }
    "RCU" = @{ FR="Restaurer TOUS les services (defaut)"; EN="Restore ALL Services (default)";       ES="Restaurar TODOS los servicios";        DE="ALLE Dienste wiederherstellen" }
    "TA"  = @{ FR="Application Experience OFF";          EN="Application Experience OFF";            ES="Application Experience OFF";           DE="Application Experience OFF" }
    "TB"  = @{ FR="CEIP (telemetrie usage) OFF";         EN="CEIP (usage telemetry) OFF";            ES="CEIP (telemetria uso) OFF";            DE="CEIP (Nutzungstelemetrie) OFF" }
    "TC"  = @{ FR="Diagnostic disque OFF";               EN="Disk Diagnostic OFF";                   ES="Diagnostico disco OFF";                DE="Festplattendiagnose OFF" }
    "TD"  = @{ FR="Rapport d erreurs Windows OFF";       EN="Windows Error Reporting OFF";           ES="Informe errores Windows OFF";          DE="Windows-Fehlerberichterstattung OFF" }
    "TE"  = @{ FR="Defragmentation planifiee OFF";       EN="Scheduled Defragmentation OFF";         ES="Desfragmentacion programada OFF";      DE="Geplante Defragmentierung OFF" }
    "TF"  = @{ FR="WinSAT + Efficacite energetique OFF"; EN="WinSAT + Power Efficiency OFF";        ES="WinSAT + Eficiencia energetica OFF";   DE="WinSAT + Energieeffizienz OFF" }
    "TG"  = @{ FR="Notifications UpdateOrchestrator OFF"; EN="UpdateOrchestrator Notifications OFF"; ES="Notificaciones UpdateOrchestrator OFF"; DE="UpdateOrchestrator Benachrichtigungen OFF" }
}

$script:optDesc = @{
    "A" = @{
        FR = "Active le plan 'Ultimate Performance' de Windows. Elimine les micro-optimisations d'economie d'energie pour maximiser les performances CPU. Ideal pour les sessions de jeu intensives."
        EN = "Activates Windows 'Ultimate Performance' power plan. Eliminates micro power-saving tweaks to maximize CPU performance. Ideal for intensive gaming sessions."
        ES = "Activa el plan 'Rendimiento Maximo' de Windows. Elimina micro-optimizaciones de ahorro de energia para maximizar el rendimiento CPU. Ideal para sesiones de juego intensivas."
        DE = "Aktiviert den 'Ultimate Performance' Energieplan. Eliminiert Mikro-Energiespar-Optimierungen zur Maximierung der CPU-Leistung. Ideal fuer intensive Gaming-Sitzungen."
    }
    "B" = @{
        FR = "Desactive le CPU Parking qui met en veille les coeurs inactifs. Tous les coeurs restent actifs en permanence, reduisant la latence lors des pics de charge. Recommande pour les jeux multicore."
        EN = "Disables CPU Parking which puts idle cores to sleep. All cores stay active permanently, reducing latency during load spikes. Recommended for multicore games."
        ES = "Desactiva el CPU Parking que pone en reposo los nucleos inactivos. Todos los nucleos permanecen activos, reduciendo la latencia. Recomendado para juegos multinucleo."
        DE = "Deaktiviert CPU Parking. Alle Kerne bleiben permanent aktiv und reduzieren Latenz bei Lastspitzen. Empfohlen fuer Multicore-Spiele."
    }
    "C" = @{
        FR = "Desactive SysMain (Superfetch) qui precharge des apps en RAM. Ce service consomme des ressources inutiles pendant le jeu et augmente les acces disque parasites."
        EN = "Disables SysMain (Superfetch) which preloads apps into RAM. This service wastes resources during gaming and increases unnecessary disk access."
        ES = "Desactiva SysMain (Superfetch) que precarga apps en RAM. Este servicio consume recursos innecesarios durante el juego y aumenta los accesos al disco."
        DE = "Deaktiviert SysMain (Superfetch). Dieser Dienst verbraucht unnoetige Ressourcen beim Spielen und erhoht die Festplattenzugriffe."
    }
    "D" = @{
        FR = "Ameliore la precision du timer systeme et desactive le Dynamic Tick de Windows. Resultat: timestamps plus precis et meilleure interpolation de frames. Necessite un redemarrage."
        EN = "Improves system timer precision and disables Windows Dynamic Tick. Result: more precise timestamps and better frame interpolation. Requires a reboot."
        ES = "Mejora la precision del temporizador del sistema y desactiva el Dynamic Tick. Resultado: marcas de tiempo mas precisas. Requiere reinicio."
        DE = "Verbessert die System-Timer-Genauigkeit und deaktiviert Windows Dynamic Tick. Ergebnis: praezisere Zeitstempel. Neustart erforderlich."
    }
    "E" = @{
        FR = "Desactive les services de telemetrie Microsoft (DiagTrack, dmwappushservice, etc.). Reduit les activites reseau en arriere-plan et libere des ressources CPU pendant le jeu."
        EN = "Disables Microsoft telemetry services (DiagTrack, dmwappushservice, etc.). Reduces background network activity and frees CPU resources during gaming."
        ES = "Desactiva los servicios de telemetria de Microsoft. Reduce la actividad de red en segundo plano y libera recursos CPU durante el juego."
        DE = "Deaktiviert Microsoft-Telemetriedienste. Reduziert Hintergrund-Netzwerkaktivitaet und gibt CPU-Ressourcen frei."
    }
    "F" = @{
        FR = "Desactive l'hibernation et supprime le fichier hiberfil.sys. Libere plusieurs Go d'espace disque et accelere les demarrages. Recommande si vous utilisez le mode veille standard."
        EN = "Disables hibernation and removes the hiberfil.sys file. Frees several GB of disk space and speeds up startups. Recommended if you use standard sleep mode."
        ES = "Desactiva la hibernacion y elimina hiberfil.sys. Libera varios GB de espacio en disco y acelera el arranque. Recomendado si usas el modo suspension estandar."
        DE = "Deaktiviert den Ruhezustand und entfernt hiberfil.sys. Gibt mehrere GB Speicherplatz frei und beschleunigt Starts."
    }
    "G" = @{
        FR = "Configure le fichier d'echange Windows a une taille fixe equivalente a la RAM. Evite les redimensionnements dynamiques qui fragmentent le disque et ralentissent le systeme."
        EN = "Configures the Windows pagefile to a fixed size equal to your RAM. Avoids dynamic resizing that fragments the disk and slows down the system."
        ES = "Configura el archivo de pagina de Windows a un tamano fijo equivalente a la RAM. Evita el redimensionamiento dinamico que fragmenta el disco."
        DE = "Konfiguriert die Auslagerungsdatei auf eine feste Groesse. Vermeidet dynamische Groessenaenderungen, die die Festplatte fragmentieren."
    }
    "H" = @{
        FR = "Force Windows a privilegier les processus utilisateur plutot que le cache systeme. Par defaut, Windows peut allouer trop de RAM au cache de fichiers au detriment du jeu."
        EN = "Forces Windows to prioritize user processes over system cache. By default, Windows may allocate too much RAM to file cache at the expense of gaming."
        ES = "Fuerza a Windows a priorizar procesos de usuario sobre la cache del sistema. Por defecto Windows puede asignar demasiada RAM a la cache de archivos."
        DE = "Zwingt Windows, Benutzerprozesse gegenueber dem System-Cache zu priorisieren. Windows weist dem Datei-Cache moeglicherweise zu viel RAM zu."
    }
    "I" = @{
        FR = "Active le planificateur GPU materiel (HAGS) de Windows. Reduit la latence GPU en gerant le scheduling dans le driver graphique plutot que dans le CPU. GPU compatible requis."
        EN = "Enables Hardware GPU Scheduling (HAGS). Reduces GPU latency by managing scheduling in the graphics driver instead of the CPU. Requires a compatible GPU."
        ES = "Activa la planificacion GPU por hardware (HAGS). Reduce la latencia GPU gestionando el scheduling en el driver grafico. Requiere GPU compatible."
        DE = "Aktiviert Hardware-GPU-Scheduling (HAGS). Reduziert GPU-Latenz durch Verwaltung des Scheduling im Grafiktreiber. Kompatible GPU erforderlich."
    }
    "J" = @{
        FR = "Desactive les optimisations plein ecran Windows qui interferent avec les jeux. Permet au jeu de prendre le controle exclusif du GPU et reduit les stutters en mode exclusif."
        EN = "Disables Windows fullscreen optimizations that interfere with games. Allows the game exclusive GPU control and reduces stutters in exclusive mode."
        ES = "Desactiva las optimizaciones de pantalla completa de Windows que interfieren con los juegos. Permite al juego control exclusivo del GPU y reduce los stutters."
        DE = "Deaktiviert Windows-Vollbildoptimierungen. Ermoeglicht dem Spiel exklusive GPU-Kontrolle und reduziert Stottern im Exklusivmodus."
    }
    "K" = @{
        FR = "Active le mode MSI (Message Signaled Interrupts) pour la carte graphique. Remplace les interruptions PCI classiques par des messages plus efficaces, reduisant la latence GPU."
        EN = "Enables MSI (Message Signaled Interrupts) mode for the graphics card. Replaces legacy PCI interrupts with more efficient messages, reducing GPU latency."
        ES = "Activa el modo MSI para la tarjeta grafica. Reemplaza las interrupciones PCI clasicas por mensajes mas eficientes, reduciendo la latencia GPU."
        DE = "Aktiviert den MSI-Modus fuer die Grafikkarte. Ersetzt klassische PCI-Interrupts durch effizientere Nachrichten und reduziert GPU-Latenz."
    }
    "L" = @{
        FR = "Desactive l'isolation des coeurs (Memory Integrity) du noyau Windows. Peut ameliorer les performances GPU de 5-15%. Necessite un redemarrage et reduit la securite systeme."
        EN = "Disables core isolation (Memory Integrity) in the Windows kernel. Can improve GPU performance by 5-15%. Requires reboot and reduces system security."
        ES = "Desactiva el aislamiento de nucleos (Memory Integrity). Puede mejorar el rendimiento GPU un 5-15%. Requiere reinicio y reduce la seguridad del sistema."
        DE = "Deaktiviert Kernisolierung (Memory Integrity). Kann GPU-Leistung um 5-15% verbessern. Neustart erforderlich, Sicherheit wird reduziert."
    }
    "M" = @{
        FR = "Desactive l'algorithme de Nagle qui regroupe les paquets TCP. Active les options TCP optimisees pour le gaming (CTCP, tuning). Reduit directement le ping en jeu."
        EN = "Disables Nagle's algorithm which groups TCP packets. Enables TCP options optimized for gaming (CTCP, tuning). Directly reduces in-game ping."
        ES = "Desactiva el algoritmo de Nagle que agrupa paquetes TCP. Activa opciones TCP para gaming. Reduce directamente el ping en el juego."
        DE = "Deaktiviert Nagles Algorithmus. Aktiviert fuer Gaming optimierte TCP-Optionen. Reduziert direkt den In-Game-Ping."
    }
    "N" = @{
        FR = "Desactive la gestion d'energie des cartes reseau. Empeche Windows de mettre la carte reseau en veille, evitant les deconnexions et pics de latence soudains."
        EN = "Disables power management on network cards. Prevents Windows from sleeping the network card, avoiding disconnections and sudden latency spikes."
        ES = "Desactiva la gestion de energia de las tarjetas de red. Evita que Windows ponga la tarjeta en reposo, evitando desconexiones y picos de latencia."
        DE = "Deaktiviert Energieverwaltung der Netzwerkkarten. Verhindert, dass Windows die Karte in den Schlafmodus versetzt und vermeidet Verbindungsabbrueche."
    }
    "O" = @{
        FR = "Supprime la reserve QoS de 20% de bande passante que Windows conserve par defaut. Permet aux jeux d'utiliser 100% de la connexion disponible."
        EN = "Removes the 20% QoS bandwidth reserve Windows keeps by default. Allows games to use 100% of the available connection bandwidth."
        ES = "Elimina la reserva QoS del 20% de ancho de banda que Windows mantiene por defecto. Permite a los juegos usar el 100% del ancho de banda."
        DE = "Entfernt die QoS-Bandbreitenreserve von 20%. Ermoeglicht Spielen, 100% der verfuegbaren Bandbreite zu nutzen."
    }
    "P" = @{
        FR = "Vide le cache DNS local et reinitialise la pile Winsock et IP. Resout les problemes de connexion et de resolution DNS lents ou errones."
        EN = "Clears the local DNS cache and resets the Winsock and IP stack. Resolves connection issues and slow or incorrect DNS resolution."
        ES = "Vacia la cache DNS local y reinicia la pila Winsock e IP. Resuelve problemas de conexion y resolucion DNS lenta o incorrecta."
        DE = "Leert den lokalen DNS-Cache und setzt Winsock- und IP-Stack zurueck. Loest Verbindungsprobleme und langsame DNS-Aufloesungen."
    }
    "Q" = @{
        FR = "Desactive tous les effets visuels Windows (animations, ombres, transparences). Libere des ressources GPU et CPU pour le jeu et ameliore la reactivite de l'interface."
        EN = "Disables all Windows visual effects (animations, shadows, transparencies). Frees GPU and CPU resources for gaming and improves interface responsiveness."
        ES = "Desactiva todos los efectos visuales de Windows. Libera recursos GPU y CPU para los juegos y mejora la capacidad de respuesta de la interfaz."
        DE = "Deaktiviert alle Windows-Visualeffekte. Gibt GPU- und CPU-Ressourcen fuer Spiele frei und verbessert die Interface-Reaktionsfaehigkeit."
    }
    "R" = @{
        FR = "Desactive la Xbox Game Bar et l'enregistrement DVR en arriere-plan. Ces fonctions consomment du CPU et de la RAM meme sans etre utilisees activement."
        EN = "Disables Xbox Game Bar and DVR background recording. These features consume CPU and RAM even without active use."
        ES = "Desactiva Xbox Game Bar y la grabacion DVR en segundo plano. Estas funciones consumen CPU y RAM incluso sin usarse."
        DE = "Deaktiviert Xbox Game Bar und DVR-Hintergrundaufzeichnung. Diese Funktionen verbrauchen CPU und RAM auch ohne aktive Nutzung."
    }
    "S" = @{
        FR = "Desactive les notifications toast et le centre de notifications Windows. Empeche les interruptions pendant les sessions de jeu sans impact sur les applications."
        EN = "Disables toast notifications and Windows notification center. Prevents interruptions during gaming sessions with no impact on applications."
        ES = "Desactiva las notificaciones toast y el centro de notificaciones de Windows. Previene interrupciones durante las sesiones de juego."
        DE = "Deaktiviert Toast-Benachrichtigungen und das Benachrichtigungscenter. Verhindert Unterbrechungen waehrend Gaming-Sessions."
    }
    "T" = @{
        FR = "Desactive Cortana via les politiques de groupe Windows. Reduit la charge CPU et les requetes reseau permanentes de l'assistant vocal Microsoft."
        EN = "Disables Cortana via Windows group policies. Reduces CPU load and permanent network requests from Microsoft's voice assistant."
        ES = "Desactiva Cortana a traves de las politicas de grupo de Windows. Reduce la carga de CPU y las solicitudes de red permanentes del asistente de voz."
        DE = "Deaktiviert Cortana ueber Windows-Gruppenrichtlinien. Reduziert CPU-Last und permanente Netzwerkanfragen des Sprachassistenten."
    }
    "U" = @{
        FR = "Desactive la precision du pointeur Windows (acceleration souris). Active l'input 100% raw sans courbe d'acceleration. Essentiel pour un aim precis en FPS."
        EN = "Disables Windows pointer precision (mouse acceleration). Enables 100% raw input without acceleration curve. Essential for precise aiming in FPS games."
        ES = "Desactiva la precision del puntero de Windows (aceleracion del raton). Activa el input 100% raw. Esencial para un aim preciso en FPS."
        DE = "Deaktiviert Windows-Zeigergenauigkeit (Mausbeschleunigung). Aktiviert 100% Raw-Input. Essenziell fuer praezises Zielen in FPS-Spielen."
    }
    "V" = @{
        FR = "Desactive la transparence des fenetres et les animations d'ouverture/fermeture. Reduit la charge du GPU pour l'interface Windows et ameliore la reactivite du bureau."
        EN = "Disables window transparency and open/close animations. Reduces GPU load for the Windows interface and improves desktop responsiveness."
        ES = "Desactiva la transparencia de ventanas y las animaciones. Reduce la carga GPU de la interfaz de Windows y mejora la capacidad de respuesta."
        DE = "Deaktiviert Fenstertransparenz und Animationen. Reduziert GPU-Last fuer die Windows-Oberflaeche und verbessert Desktop-Reaktionsfaehigkeit."
    }
    "W" = @{
        FR = "Arrete et desactive le service Windows Search. Supprime l'indexation permanente des fichiers qui consomme des ressources disque et CPU en arriere-plan."
        EN = "Stops and disables the Windows Search service. Removes permanent file indexing that consumes disk and CPU resources in the background."
        ES = "Detiene y desactiva el servicio Windows Search. Elimina la indexacion permanente de archivos que consume recursos de disco y CPU."
        DE = "Haelt den Windows Search-Dienst an. Entfernt die permanente Dateiindizierung, die Festplatten- und CPU-Ressourcen verbraucht."
    }
    "X" = @{
        FR = "Desactive l'execution des apps UWP en arriere-plan. Ces applications consomment de la RAM et du CPU meme sans etre utilisees. N'affecte pas les apps Win32 classiques."
        EN = "Disables UWP app background execution. These apps consume RAM and CPU even when unused. Does not affect classic Win32 desktop applications."
        ES = "Desactiva la ejecucion en segundo plano de apps UWP. Estas apps consumen RAM y CPU sin usarse. No afecta a las apps de escritorio Win32 clasicas."
        DE = "Deaktiviert UWP-App-Hintergrundausfuehrung. Diese Apps verbrauchen RAM und CPU auch ohne Nutzung. Betrifft keine klassischen Win32-Apps."
    }
    "Y" = @{
        FR = "Desactive plusieurs services Windows non essentiels (Fax, Xbox, WMP Network, etc.). Libere de la RAM et reduit les processus en arriere-plan. Verifiez votre manette Xbox."
        EN = "Disables several non-essential Windows services (Fax, Xbox, WMP Network, etc.). Frees RAM and reduces background processes. Check your Xbox controller if you use one."
        ES = "Desactiva varios servicios de Windows no esenciales (Fax, Xbox, WMP Network, etc.). Libera RAM y reduce procesos en segundo plano. Verifica tu mando Xbox si usas uno."
        DE = "Deaktiviert mehrere nicht wesentliche Windows-Dienste (Fax, Xbox, WMP-Netzwerk, etc.). Gibt RAM frei. Xbox-Controller pruefen falls verwendet."
    }
    "Z" = @{
        FR = "Desactive Windows Update pour la duree de la session. Empeche les telechargements automatiques pendant le jeu. Pensez a le reactiver apres votre session de jeu."
        EN = "Disables Windows Update for the current session. Prevents automatic downloads during gaming. Remember to re-enable it after your gaming session."
        ES = "Desactiva Windows Update durante la sesion actual. Evita descargas automaticas durante el juego. Recuerda volver a activarlo despues de tu sesion."
        DE = "Deaktiviert Windows Update fuer die aktuelle Sitzung. Verhindert automatische Downloads beim Spielen. Nach der Sitzung wieder aktivieren."
    }
    "1" = @{
        FR = "Active le Game Mode Windows qui priorise les ressources systeme pour le jeu actif. Reduit les interruptions des processus d'arriere-plan pendant les sessions de jeu."
        EN = "Enables Windows Game Mode which prioritizes system resources for the active game. Reduces background process interruptions during gaming sessions."
        ES = "Activa el Modo Juego de Windows que prioriza los recursos del sistema para el juego activo. Reduce las interrupciones de procesos en segundo plano."
        DE = "Aktiviert den Windows-Spielmodus, der Systemressourcen fuer das aktive Spiel priorisiert. Reduziert Hintergrundprozess-Unterbrechungen."
    }
    "2" = @{
        FR = "Configure le profil MMCSS pour le gaming. Alloue une priorite GPU et CPU maximale aux processus de jeu. Reduit les micro-stutters et ameliore la regularite des FPS."
        EN = "Configures the MMCSS profile for gaming. Allocates maximum GPU and CPU priority to game processes. Reduces micro-stutters and improves FPS consistency."
        ES = "Configura el perfil MMCSS para gaming. Asigna prioridad maxima de GPU y CPU a los procesos de juego. Reduce micro-stutters y mejora la consistencia de FPS."
        DE = "Konfiguriert das MMCSS-Profil fuer Gaming. Weist Spielprozessen maximale GPU- und CPU-Prioritaet zu. Reduziert Micro-Stottern und verbessert FPS-Konsistenz."
    }
    "3" = @{
        FR = "Definit la priorite CPU (High) et IO (High) pour les executables COD/Warzone/BO6. Windows traitera ces processus en priorite absolue, reduisant les stutters."
        EN = "Sets CPU (High) and IO (High) priority for COD/Warzone/BO6 executables. Windows treats these processes with absolute priority, reducing stutters."
        ES = "Establece prioridad CPU (Alta) e IO (Alta) para los ejecutables de COD/Warzone/BO6. Windows los tratara con prioridad absoluta, reduciendo stutters."
        DE = "Setzt CPU (Hoch) und IO (Hoch) Prioritaet fuer COD/Warzone/BO6. Windows behandelt diese Prozesse mit absoluter Prioritaet und reduziert Stottern."
    }
    "4" = @{
        FR = "Desactive le moteur de compatibilite d'applications (AppCompat Shim). Supprime une couche de detection pour les vieux logiciels. Peut rendre certains anciens programmes instables."
        EN = "Disables the application compatibility engine (AppCompat Shim). Removes a detection layer for old software. May make some legacy programs unstable."
        ES = "Desactiva el motor de compatibilidad de aplicaciones. Elimina una capa de deteccion para software antiguo. Puede hacer inestables algunos programas antiguos."
        DE = "Deaktiviert die Anwendungskompatibilitaets-Engine. Entfernt eine Erkennungsschicht fuer alte Software. Kann einige aeltere Programme instabil machen."
    }
    "5" = @{
        FR = "Supprime les fichiers temporaires Windows, le cache Prefetch et vide la Corbeille. Libere de l'espace disque et peut ameliorer les temps de demarrage de Windows."
        EN = "Removes Windows temporary files, Prefetch cache and empties the Recycle Bin. Frees disk space and can improve Windows startup times."
        ES = "Elimina los archivos temporales de Windows, la cache Prefetch y vacia la Papelera. Libera espacio en disco y puede mejorar los tiempos de inicio de Windows."
        DE = "Entfernt temporaere Windows-Dateien, Prefetch-Cache und leert den Papierkorb. Gibt Speicherplatz frei und kann Windows-Startzeiten verbessern."
    }
    "6" = @{
        FR = "Vide le cache DNS, reinitialise Winsock et la pile IP, puis renouvelle l'adresse IP. Plus complet que l'option P : resout les problemes de connexion recurrents."
        EN = "Flushes DNS cache, resets Winsock and IP stack, then renews the IP address. More complete than option P: resolves recurring connection issues."
        ES = "Vacia la cache DNS, reinicia Winsock y la pila IP, luego renueva la IP. Mas completo que la opcion P: resuelve problemas de conexion recurrentes."
        DE = "Leert DNS-Cache, setzt Winsock und IP-Stack zurueck, erneuert dann die IP. Umfassender als Option P: loest wiederkehrende Verbindungsprobleme."
    }
    "7" = @{
        FR = "Desactive l'UAC qui protege contre les executions non autorisees. RISQUE ELEVE : tout processus malveillant peut s'executer avec droits admin sans aucune alerte."
        EN = "Disables UAC which protects against unauthorized execution. HIGH RISK: any malicious process can run with admin rights without any warning."
        ES = "Desactiva el UAC que protege contra ejecuciones no autorizadas. RIESGO ALTO: cualquier proceso malicioso puede ejecutarse con derechos de administrador sin alerta."
        DE = "Deaktiviert UAC. HOHES RISIKO: Jeder schaedliche Prozess kann ohne Warnung mit Adminrechten ausgefuehrt werden."
    }
    "8" = @{
        FR = "Desactive les protections hardware Spectre et Meltdown. Gain possible de 5-15% CPU. RISQUE : vulnerabilite kernel exploitable par des attaques cote-canal."
        EN = "Disables Spectre and Meltdown hardware protections. Possible 5-15% CPU gain. RISK: kernel vulnerability exploitable by side-channel attacks."
        ES = "Desactiva las protecciones hardware Spectre y Meltdown. Posible ganancia de 5-15% CPU. RIESGO: vulnerabilidad del kernel explotable por ataques de canal lateral."
        DE = "Deaktiviert Spectre- und Meltdown-Schutz. Moeglicher 5-15% CPU-Gewinn. RISIKO: Kernel-Schwachstelle durch Seitenkanal-Angriffe ausnutzbar."
    }
    "9" = @{
        FR = "Desactive la protection antivirus temps reel de Windows Defender. RISQUE CRITIQUE : aucun fichier ne sera analyse. Utilisez seulement si un autre antivirus est actif."
        EN = "Disables Windows Defender real-time antivirus protection. CRITICAL RISK: no files will be scanned. Use only if another antivirus is active."
        ES = "Desactiva la proteccion antivirus en tiempo real de Windows Defender. RIESGO CRITICO: ningun archivo sera analizado. Usar solo si hay otro antivirus activo."
        DE = "Deaktiviert Defender Echtzeit-Virenschutz. KRITISCHES RISIKO: Keine Dateien werden gescannt. Nur verwenden wenn ein anderes Antivirusprogramm aktiv ist."
    }
    "0" = @{
        FR = "Desactive la virtualisation securisee du kernel Windows (VBS + Core Isolation). Gain de performances variable selon le GPU. RISQUE : supprime la protection contre les rootkits."
        EN = "Disables Windows secure kernel virtualization (VBS + Core Isolation). Variable performance gain. RISK: removes protection against rootkits and kernel exploits."
        ES = "Desactiva la virtualizacion segura del kernel de Windows (VBS + Core Isolation). Ganancia variable. RIESGO: elimina la proteccion contra rootkits y exploits del kernel."
        DE = "Deaktiviert sichere Kernel-Virtualisierung (VBS + Core Isolation). Variabler Leistungsgewinn. RISIKO: Entfernt Schutz gegen Rootkits und Kernel-Exploits."
    }
    "NA" = @{
        FR = "Configure les serveurs DNS de tous les adaptateurs sur Cloudflare (1.1.1.1 / 1.0.0.1). DNS gaming ultra-rapide avec latence reduite et resolution de noms quasi instantanee."
        EN = "Sets DNS servers on all adapters to Cloudflare (1.1.1.1 / 1.0.0.1). Ultra-fast gaming DNS with reduced latency and near-instant name resolution."
        ES = "Configura los servidores DNS en todos los adaptadores a Cloudflare (1.1.1.1 / 1.0.0.1). DNS gaming ultra-rapido con latencia reducida."
        DE = "Setzt DNS-Server auf allen Adaptern auf Cloudflare (1.1.1.1 / 1.0.0.1). Ultra-schnelles Gaming-DNS mit reduzierter Latenz."
    }
    "NB" = @{
        FR = "Desactive le Large Send Offload (LSO) sur la carte reseau. Empeche le regroupement de paquets TCP par le NIC, reduisant la latence au detriment du debit. Ideal pour le gaming."
        EN = "Disables Large Send Offload (LSO) on the network card. Prevents TCP packet batching by the NIC, reducing latency at the cost of throughput. Ideal for gaming."
        ES = "Desactiva Large Send Offload (LSO) en la tarjeta de red. Evita el agrupamiento de paquetes TCP por el NIC, reduciendo la latencia. Ideal para gaming."
        DE = "Deaktiviert Large Send Offload (LSO) auf der Netzwerkkarte. Verhindert TCP-Paket-Batching durch die NIC, reduziert Latenz auf Kosten des Durchsatzes."
    }
    "NC" = @{
        FR = "Desactive l'Interrupt Moderation sur le NIC. Sans ce mecanisme, chaque paquet declenche une interruption CPU immediate, reduisant la latence reseau au minimum absolu."
        EN = "Disables Interrupt Moderation on the NIC. Without this mechanism, every packet triggers an immediate CPU interrupt, reducing network latency to the absolute minimum."
        ES = "Desactiva la Modulacion de Interrupciones en el NIC. Sin este mecanismo, cada paquete genera una interrupcion CPU inmediata, minimizando la latencia de red."
        DE = "Deaktiviert Interrupt Moderation auf der NIC. Jedes Paket loest sofort einen CPU-Interrupt aus, was die Netzwerklatenz auf ein absolutes Minimum reduziert."
    }
    "ND" = @{
        FR = "Desactive le throttling reseau de Windows (NetworkThrottlingIndex=0xFFFFFFFF). Par defaut, Windows limite les paquets reseau pour les apps non-multimedia. Supprime cette limite pour le jeu."
        EN = "Disables Windows network throttling (NetworkThrottlingIndex=0xFFFFFFFF). By default, Windows limits network packets for non-multimedia apps. Removes this limit for gaming."
        ES = "Desactiva el throttling de red de Windows. Por defecto, Windows limita los paquetes de red para apps no multimedia. Elimina este limite para gaming."
        DE = "Deaktiviert Windows-Netzwerkdrosselung. Windows begrenzt standardmaessig Netzwerkpakete fuer Nicht-Multimedia-Apps. Entfernt dieses Limit fuer Gaming."
    }
    "NE" = @{
        FR = "Desactive le protocole IPv6 sur tous les adaptateurs reseau actifs. Elimine les conflits de routage dual-stack et reduit la latence sur les serveurs Warzone en IPv4 pur."
        EN = "Disables IPv6 protocol on all active network adapters. Eliminates dual-stack routing conflicts and reduces latency on Warzone servers using pure IPv4."
        ES = "Desactiva el protocolo IPv6 en todos los adaptadores de red activos. Elimina conflictos de enrutamiento dual-stack y reduce la latencia en servidores IPv4."
        DE = "Deaktiviert IPv6 auf allen aktiven Netzwerkadaptern. Eliminiert Dual-Stack-Routing-Konflikte und reduziert Latenz auf reinen IPv4-Warzone-Servern."
    }
    "NF" = @{
        FR = "Desactive les tunnels IPv6 de transition (Teredo, 6to4, ISATAP). Ces services encapsulent IPv6 dans IPv4 et introduisent une latence supplementaire. Sans impact sur les connexions IPv4 natives."
        EN = "Disables IPv6 transition tunnels (Teredo, 6to4, ISATAP). These services encapsulate IPv6 in IPv4 and add extra latency. No impact on native IPv4 connections."
        ES = "Desactiva los tuneles de transicion IPv6 (Teredo, 6to4, ISATAP). Estos servicios encapsulan IPv6 en IPv4 y agregan latencia extra."
        DE = "Deaktiviert IPv6-Uebergangstunnel (Teredo, 6to4, ISATAP). Diese Dienste kapseln IPv6 in IPv4 und fuegen extra Latenz hinzu."
    }
    "NG" = @{
        FR = "Desactive le Chimney Offload et NetDMA. Force le CPU a gerer le traitement TCP complet plutot que de le deleguer au NIC, donnant un meilleur controle de la latence pour les jeux."
        EN = "Disables Chimney Offload and NetDMA. Forces the CPU to handle full TCP processing rather than delegating to the NIC, giving better latency control for gaming."
        ES = "Desactiva Chimney Offload y NetDMA. Fuerza al CPU a gestionar el procesamiento TCP completo en lugar de delegarlo al NIC, mejorando el control de latencia."
        DE = "Deaktiviert Chimney Offload und NetDMA. Zwingt die CPU zur vollstaendigen TCP-Verarbeitung statt NIC-Delegation, was bessere Latenz-Kontrolle fuer Gaming gibt."
    }
    "NH" = @{
        FR = "Desactive NetBIOS over TCP/IP sur tous les adaptateurs. Elimine les broadcasts NetBIOS parasites sur le reseau local qui consomment de la bande passante et augmentent la latence."
        EN = "Disables NetBIOS over TCP/IP on all adapters. Eliminates parasitic NetBIOS broadcasts on the local network that consume bandwidth and increase latency."
        ES = "Desactiva NetBIOS sobre TCP/IP en todos los adaptadores. Elimina los broadcasts NetBIOS parasitos en la red local que consumen ancho de banda."
        DE = "Deaktiviert NetBIOS ueber TCP/IP auf allen Adaptern. Eliminiert parasitaere NetBIOS-Broadcasts im lokalen Netzwerk, die Bandbreite verbrauchen."
    }
    "NI" = @{
        FR = "Optimise les parametres TCP globaux : TTL=64, GlobalMaxTcpWindowSize, suppression SynAttackProtect. Reduit le nombre de retransmissions et stabilise les connexions aux serveurs de jeu."
        EN = "Optimizes global TCP parameters: TTL=64, GlobalMaxTcpWindowSize, removes SynAttackProtect. Reduces retransmissions and stabilizes connections to game servers."
        ES = "Optimiza los parametros TCP globales: TTL=64, GlobalMaxTcpWindowSize, elimina SynAttackProtect. Reduce retransmisiones y estabiliza conexiones a servidores de juego."
        DE = "Optimiert globale TCP-Parameter: TTL=64, GlobalMaxTcpWindowSize, entfernt SynAttackProtect. Reduziert Neuuebertragungen und stabilisiert Verbindungen zu Spielservern."
    }
    "NJ" = @{
        FR = "Desactive le Packet Coalescing (regroupement de paquets) et active RSS sur le NIC. Traitement immediat de chaque paquet sans attente, latence reduite. RSS distribue la charge sur plusieurs coeurs."
        EN = "Disables Packet Coalescing and enables RSS on the NIC. Immediate processing of each packet without waiting, reduced latency. RSS distributes load across multiple cores."
        ES = "Desactiva la coalescencia de paquetes y activa RSS en el NIC. Procesamiento inmediato de cada paquete sin espera, latencia reducida. RSS distribuye la carga entre nucleos."
        DE = "Deaktiviert Paket-Koaleszenz und aktiviert RSS auf der NIC. Sofortige Verarbeitung jedes Pakets ohne Wartezeit. RSS verteilt Last auf mehrere Kerne."
    }
    "RCA" = @{
        FR = "Remet le plan d'alimentation Windows sur Balanced (equilibre). Annule le plan Ultimate Performance. Recommande pour une utilisation quotidienne hors jeu pour preserver la duree de vie du CPU."
        EN = "Restores Windows power plan to Balanced. Reverts Ultimate Performance plan. Recommended for daily non-gaming use to preserve CPU lifespan."
        ES = "Restaura el plan de energia de Windows a Equilibrado. Revierte el plan de Rendimiento Maximo. Recomendado para uso diario fuera del juego."
        DE = "Stellt den Windows-Energieplan auf Ausgewogen zurueck. Setzt den Ultimate Performance Plan zurueck. Empfohlen fuer den taeglichen Nicht-Gaming-Betrieb."
    }
    "RCB" = @{
        FR = "Reactive SysMain (Superfetch). Windows reprend le prechargeement des applications frequemment utilisees en RAM. Utile si vous constatez des lenteurs au demarrage d'applications."
        EN = "Re-enables SysMain (Superfetch). Windows resumes preloading frequently used apps into RAM. Useful if you notice slowdowns when launching applications."
        ES = "Reactiva SysMain (Superfetch). Windows reanuda la precarga de apps frecuentes en RAM. Util si notas lentitud al iniciar aplicaciones."
        DE = "Reaktiviert SysMain (Superfetch). Windows laedt haeufig genutzte Apps wieder in den RAM vor. Nuetzlich bei Startverzoegerungen."
    }
    "RCC" = @{
        FR = "Reactive Windows Update (wuauserv) et le remet en demarrage automatique. Essentiel pour recevoir les correctifs de securite et les mises a jour de pilotes importantes."
        EN = "Re-enables Windows Update (wuauserv) and sets it back to automatic start. Essential for receiving security patches and important driver updates."
        ES = "Reactiva Windows Update y lo pone en inicio automatico. Esencial para recibir parches de seguridad y actualizaciones de controladores."
        DE = "Reaktiviert Windows Update und setzt es auf automatischen Start. Unverzichtbar fuer Sicherheitspatches und wichtige Treiber-Updates."
    }
    "RCD" = @{
        FR = "Reactive l'hibernation Windows et recrée le fichier hiberfil.sys. Necessaire si vous utilisez le mode hibernation ou si votre laptop ne se met plus en veille prolongee correctement."
        EN = "Re-enables Windows hibernation and recreates hiberfil.sys. Necessary if you use hibernation mode or your laptop no longer sleeps correctly."
        ES = "Reactiva la hibernacion de Windows y recrea hiberfil.sys. Necesario si usas el modo hibernacion o tu laptop no entra en suspension correctamente."
        DE = "Reaktiviert Windows-Ruhezustand und erstellt hiberfil.sys neu. Erforderlich bei Nutzung des Ruhezustands oder bei Problemen mit dem Laptop-Schlafmodus."
    }
    "RCE" = @{
        FR = "Reactive IPv6 sur tous les adaptateurs reseau. Necessaire si certains sites, services VPN ou connexions reseau ne fonctionnent plus correctement apres desactivation."
        EN = "Re-enables IPv6 on all network adapters. Necessary if some websites, VPN services or network connections stopped working correctly after disabling."
        ES = "Reactiva IPv6 en todos los adaptadores de red. Necesario si ciertos sitios, servicios VPN o conexiones de red dejaron de funcionar correctamente."
        DE = "Reaktiviert IPv6 auf allen Netzwerkadaptern. Erforderlich wenn Websites, VPN-Dienste oder Netzwerkverbindungen nach der Deaktivierung nicht mehr funktionieren."
    }
    "RCF" = @{
        FR = "Remet le DNS de tous les adaptateurs en automatique (DHCP). Annule la configuration DNS Cloudflare. Utile si votre FAI impose un DNS specifique ou si vous avez des problemes de connexion."
        EN = "Resets DNS on all adapters to automatic (DHCP). Reverts Cloudflare DNS configuration. Useful if your ISP requires a specific DNS or you have connection issues."
        ES = "Restablece el DNS de todos los adaptadores a automatico (DHCP). Revierte la configuracion DNS de Cloudflare. Util si tu ISP requiere un DNS especifico."
        DE = "Setzt DNS auf allen Adaptern auf automatisch (DHCP) zurueck. Setzt Cloudflare-DNS-Konfiguration zurueck. Nuetzlich wenn Ihr ISP ein spezifisches DNS benoetigt."
    }
    "RCG" = @{
        FR = "Reactive Xbox Game Bar et le DVR. Necessaire pour les captures de gameplay, clips et screenshots via Win+G. Certains jeux le requierent aussi pour les performances Xbox."
        EN = "Re-enables Xbox Game Bar and DVR. Necessary for gameplay captures, clips and screenshots via Win+G. Some games also require it for Xbox performance features."
        ES = "Reactiva Xbox Game Bar y DVR. Necesario para capturas de gameplay, clips y screenshots con Win+G. Algunos juegos lo requieren para funciones Xbox."
        DE = "Reaktiviert Xbox Game Bar und DVR. Erforderlich fuer Gameplay-Aufnahmen, Clips und Screenshots mit Win+G. Einige Spiele benoetigen es fuer Xbox-Funktionen."
    }
    "RCH" = @{
        FR = "Reactive la protection antivirus temps reel de Windows Defender. A faire imperativement si vous n'avez pas d'autre antivirus installe pour retrouver une protection minimale."
        EN = "Re-enables Windows Defender real-time antivirus protection. Must do if you have no other antivirus installed to restore minimum protection."
        ES = "Reactiva la proteccion antivirus en tiempo real de Windows Defender. Imprescindible si no tienes otro antivirus instalado para restaurar proteccion minima."
        DE = "Reaktiviert den Echtzeit-Virenschutz von Windows Defender. Unbedingt erforderlich wenn kein anderes Antivirusprogramm installiert ist."
    }
    "RCI" = @{
        FR = "Reactive le Controle de Compte Utilisateur (UAC). Restaure la protection standard contre les modifications non autorisees du systeme. Recommande pour une utilisation quotidienne normale."
        EN = "Re-enables User Account Control (UAC). Restores standard protection against unauthorized system modifications. Recommended for normal daily use."
        ES = "Reactiva el Control de Cuentas de Usuario (UAC). Restaura la proteccion estandar contra modificaciones no autorizadas del sistema."
        DE = "Reaktiviert die Benutzerkontensteuerung (UAC). Stellt den Standardschutz gegen unbefugte Systemmodifikationen wieder her."
    }
    "RCJ" = @{
        FR = "Reactive le service Windows Search (WSearch). Restaure la recherche dans l'Explorateur et le menu Demarrer. Necessaire si les recherches de fichiers ne fonctionnent plus."
        EN = "Re-enables Windows Search service (WSearch). Restores search in Explorer and Start menu. Necessary if file searches no longer work."
        ES = "Reactiva el servicio Windows Search. Restaura la busqueda en el Explorador y menu Inicio. Necesario si las busquedas de archivos dejaron de funcionar."
        DE = "Reaktiviert den Windows Search-Dienst. Stellt die Suche im Explorer und Startmenu wieder her. Erforderlich wenn Dateisuchen nicht mehr funktionieren."
    }
    "RCK" = @{
        FR = "Reactive Cortana. Restaure l'assistant vocal Microsoft et la recherche intelligente du menu Demarrer. A faire si vous utilisez la recherche vocale ou les suggestions intelligentes."
        EN = "Re-enables Cortana. Restores Microsoft voice assistant and smart Start menu search. Do this if you use voice search or smart suggestions."
        ES = "Reactiva Cortana. Restaura el asistente de voz de Microsoft y la busqueda inteligente del menu Inicio."
        DE = "Reaktiviert Cortana. Stellt den Microsoft-Sprachassistenten und die intelligente Startmenu-Suche wieder her."
    }
    "RCL" = @{
        FR = "Reactive les notifications systeme Windows (toasts). Restaure les alertes d'applications, mails, et messages systeme. Necessaire si vous avez rate des notifications importantes."
        EN = "Re-enables Windows system notifications (toasts). Restores app alerts, emails, and system messages. Necessary if you missed important notifications."
        ES = "Reactiva las notificaciones del sistema Windows. Restaura alertas de aplicaciones, correos y mensajes del sistema."
        DE = "Reaktiviert Windows-Systembenachrichtigungen. Stellt App-Benachrichtigungen, E-Mails und Systemmeldungen wieder her."
    }
    "RCM" = @{
        FR = "Remet les effets visuels, animations et transparence Windows sur les parametres par defaut. Restaure l'interface Aero si vous avez note des problemes d'affichage ou un aspect degradee."
        EN = "Restores visual effects, animations and Windows transparency to default settings. Restores Aero interface if you noticed display issues or a degraded appearance."
        ES = "Restaura los efectos visuales, animaciones y transparencia de Windows a los valores predeterminados."
        DE = "Stellt visuelle Effekte, Animationen und Windows-Transparenz auf Standardeinstellungen zurueck. Stellt Aero-Oberflaeche wieder her."
    }
    "RCN" = @{
        FR = "Reactive les applications de fond UWP (Store). Certaines apps comme Microsoft Teams, Mail ou les notifications de mises a jour ne fonctionnent qu'avec ce parametre actif."
        EN = "Re-enables UWP background apps (Store). Some apps like Microsoft Teams, Mail or update notifications only work with this setting enabled."
        ES = "Reactiva las aplicaciones en segundo plano UWP. Algunas apps como Teams, Correo o notificaciones de actualizaciones solo funcionan con esta configuracion activa."
        DE = "Reaktiviert UWP-Hintergrund-Apps. Einige Apps wie Teams, Mail oder Update-Benachrichtigungen funktionieren nur mit dieser Einstellung."
    }
    "RCO" = @{
        FR = "Remet le Network Throttling Index Windows sur sa valeur par defaut (10). Annule la suppression du throttling reseau. Utile si vous constatez des problemes de streaming ou de download."
        EN = "Restores Windows Network Throttling Index to default value (10). Reverts network throttling removal. Useful if you notice streaming or download issues."
        ES = "Restaura el Network Throttling Index de Windows al valor predeterminado (10). Revierte la eliminacion del throttling. Util si hay problemas de streaming o descarga."
        DE = "Stellt den Windows Network Throttling Index auf den Standardwert (10) zurueck. Setzt die Entfernung der Netzwerkdrosselung zurueck."
    }
    "RCP" = @{
        FR = "Reinitialise completement la pile TCP/IP et Winsock de Windows aux valeurs usine. Resout la majorite des problemes de connexion persistants (pas d'internet, DNS bloque, etc.)."
        EN = "Completely resets Windows TCP/IP stack and Winsock to factory values. Resolves most persistent connection issues (no internet, blocked DNS, etc.)."
        ES = "Reinicia completamente la pila TCP/IP y Winsock de Windows a valores de fabrica. Resuelve la mayoria de problemas de conexion persistentes."
        DE = "Setzt den Windows TCP/IP-Stack und Winsock vollstaendig auf Werkseinstellungen zurueck. Behebt die meisten persistenten Verbindungsprobleme."
    }
    "RCS" = @{
        FR = "Reactive les services Windows non-essentiels desactives (Fax, TabletInputService, Xbox services, etc.). A faire si votre manette Xbox, tablette graphique ou imprimante ne fonctionne plus."
        EN = "Re-enables disabled non-essential Windows services (Fax, TabletInputService, Xbox services, etc.). Do this if your Xbox controller, graphics tablet or printer stopped working."
        ES = "Reactiva los servicios de Windows no esenciales desactivados (Fax, Xbox services, etc.). Hacer si el mando Xbox, tableta grafica o impresora dejo de funcionar."
        DE = "Reaktiviert deaktivierte nicht-wesentliche Windows-Dienste (Fax, Xbox-Dienste usw.). Bei Problemen mit Xbox-Controller, Grafiktablett oder Drucker."
    }
    "RCT" = @{
        FR = "Reactive les services de telemetrie Microsoft (DiagTrack, WerSvc, PcaSvc, etc.). Necessaire si certains outils de diagnostic Windows, rapports d erreur ou fonctions systeme ne marchent plus."
        EN = "Re-enables Microsoft telemetry services (DiagTrack, WerSvc, PcaSvc, etc.). Necessary if Windows diagnostic tools, error reports or system functions stopped working."
        ES = "Reactiva los servicios de telemetria de Microsoft. Necesario si las herramientas de diagnostico de Windows o los informes de error dejaron de funcionar."
        DE = "Reaktiviert Microsoft-Telemetriedienste. Erforderlich wenn Windows-Diagnosetools, Fehlerberichte oder Systemfunktionen nicht mehr funktionieren."
    }
    "TA" = @{
        FR = "Desactive les taches planifiees Application Experience (AitAgent, ProgramDataUpdater, StartupAppTask). Ces taches collectent des donnees sur les logiciels installes et leur compatibilite."
        EN = "Disables Application Experience scheduled tasks (AitAgent, ProgramDataUpdater, StartupAppTask). These tasks collect data on installed software and compatibility."
        ES = "Desactiva las tareas programadas de Application Experience. Estas tareas recopilan datos sobre el software instalado y su compatibilidad."
        DE = "Deaktiviert Application Experience-Aufgaben. Diese Aufgaben sammeln Daten ueber installierte Software und Kompatibilitaet."
    }
    "TB" = @{
        FR = "Desactive les taches du Customer Experience Improvement Program (Consolidator, UsbCeip, KernelCeipTask). Programme d amelioration de l experience client Microsoft qui envoie des stats d usage."
        EN = "Disables Customer Experience Improvement Program tasks (Consolidator, UsbCeip, KernelCeipTask). Microsoft program that sends usage statistics."
        ES = "Desactiva tareas del Programa de mejora de la experiencia del cliente (CEIP). Programa de Microsoft que envia estadisticas de uso."
        DE = "Deaktiviert CEIP-Aufgaben. Microsoft-Programm das Nutzungsstatistiken sendet."
    }
    "TC" = @{
        FR = "Desactive la tache de diagnostic automatique du disque dur (Microsoft-Windows-DiskDiagnosticDataCollector). Collecte et envoie des donnees SMART a Microsoft pour analyse preventive."
        EN = "Disables automatic hard drive diagnostic task. Collects and sends SMART data to Microsoft for preventive analysis."
        ES = "Desactiva la tarea de diagnostico automatico del disco duro. Recopila y envia datos SMART a Microsoft."
        DE = "Deaktiviert automatische Festplattendiagnose-Aufgabe. Sammelt und sendet SMART-Daten an Microsoft."
    }
    "TD" = @{
        FR = "Desactive la tache QueueReporting de Windows Error Reporting. Empeche l envoi automatique des rapports de plantage a Microsoft. Reduit les activites disque et reseau en arriere-plan."
        EN = "Disables Windows Error Reporting QueueReporting task. Prevents automatic crash report submission to Microsoft. Reduces background disk and network activity."
        ES = "Desactiva la tarea QueueReporting de Informe de errores de Windows. Impide el envio automatico de informes de fallos a Microsoft."
        DE = "Deaktiviert die QueueReporting-Aufgabe der Windows-Fehlerberichterstattung. Verhindert automatische Absturzberichterstattung an Microsoft."
    }
    "TE" = @{
        FR = "Desactive la defragmentation planifiee automatique de Windows. Sur SSD cette tache est inutile (le TRIM suffit). Sur HDD vous pouvez la lancer manuellement selon vos besoins."
        EN = "Disables Windows automatic scheduled defragmentation. On SSDs this task is useless (TRIM is sufficient). On HDDs you can run it manually as needed."
        ES = "Desactiva la desfragmentacion automatica programada de Windows. En SSD esta tarea es inutil. En HDD se puede ejecutar manualmente."
        DE = "Deaktiviert automatische Windows-Defragmentierung. Auf SSDs ist diese Aufgabe nutzlos. Auf HDDs kann manuell defragmentiert werden."
    }
    "TF" = @{
        FR = "Desactive les taches WinSAT (benchmark systeme Windows) et Power Efficiency Diagnostics. Ces taches consomment des ressources CPU/disque lors de benchmarks automatiques non sollicites."
        EN = "Disables WinSAT (Windows system benchmark) and Power Efficiency Diagnostics tasks. These consume CPU/disk resources during unsolicited automatic benchmarks."
        ES = "Desactiva las tareas WinSAT y diagnosticos de eficiencia energetica. Consumen recursos CPU/disco durante benchmarks automaticos no solicitados."
        DE = "Deaktiviert WinSAT und Energieeffizienz-Diagnoseaufgaben. Diese verbrauchen CPU/Festplattenressourcen bei unaufgeforderten automatischen Benchmarks."
    }
    "TG" = @{
        FR = "Desactive les taches de notification de Windows Update Orchestrator (UpdateNotificationTask, USO_UxBroker). Supprime les popups de mise a jour intempestifs pendant les sessions de jeu."
        EN = "Disables Windows Update Orchestrator notification tasks. Removes intrusive update popups during gaming sessions."
        ES = "Desactiva las tareas de notificacion del Orquestador de Windows Update. Elimina popups de actualizacion durante las sesiones de juego."
        DE = "Deaktiviert Windows Update Orchestrator Benachrichtigungsaufgaben. Entfernt aufdringliche Update-Popups waehrend Gaming-Sitzungen."
    }
    "RCU" = @{
        FR = "Reinitialise d un seul coup TOUS les services modifies par l optimizer a leur valeur Windows par defaut : SysMain, Windows Update, Windows Search, telemetrie, Xbox, Fax, tablette et plus."
        EN = "Resets ALL services modified by the optimizer to their Windows default values in one shot: SysMain, Windows Update, Windows Search, telemetry, Xbox, Fax, tablet and more."
        ES = "Restablece TODOS los servicios modificados por el optimizer a sus valores predeterminados de Windows de una vez: SysMain, Windows Update, Xbox, Fax y mas."
        DE = "Setzt ALLE vom Optimizer geaenderten Dienste auf ihre Windows-Standardwerte zurueck: SysMain, Windows Update, Xbox, Fax, Tablet und mehr."
    }
}

# ================================================================
#  DONNEES
# ================================================================

$script:groups = @(
    @{
        Name  = "Systeme"
        Icon  = "SYS"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="A"; Short="Plan Ultimate Performance";       Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="B"; Short="CPU Parking desactive";           Sel=$false; Level=1; Note="reboot" }
            [pscustomobject]@{ Key="C"; Short="SysMain / Superfetch OFF";        Sel=$false; Level=1 }
            [pscustomobject]@{ Key="D"; Short="Timer + DynTick OFF";             Sel=$false; Level=2; Note="reboot"; Disclaimer="Peut creer du stutter ou une utilisation CPU anormale sur certaines machines. Evitez useplatformclock sauf diagnostic precis." }
            [pscustomobject]@{ Key="E"; Short="Telemetrie + DiagTrack OFF";      Sel=$false; Level=1 }
            [pscustomobject]@{ Key="F"; Short="Hibernation OFF";                 Sel=$false; Level=0 }
            [pscustomobject]@{ Key="H"; Short="Large System Cache OFF";          Sel=$true;  Level=0 }
        )
    }
    @{
        Name  = "GPU / Drivers"
        Icon  = "GPU"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="I"; Short="HAGS GPU Scheduling";             Sel=$true;  Level=0; Note="reboot" }
            [pscustomobject]@{ Key="J"; Short="FullScreen Optimizations OFF";    Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="K"; Short="MSI Mode interruptions GPU";      Sel=$true;  Level=0; Note="reboot" }
            [pscustomobject]@{ Key="L"; Short="Core Isolation OFF";              Sel=$false; Level=1; Note="reboot" }
        )
    }
    @{
        Name  = "Reseau"
        Icon  = "NET"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="M";  Short="Nagle off + TCP gaming";          Sel=$false; Level=1 }
            [pscustomobject]@{ Key="N";  Short="Reseau power mgmt OFF";           Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="O";  Short="QoS OFF (100% bandwidth)";        Sel=$false; Level=1 }
            [pscustomobject]@{ Key="P";  Short="Flush DNS + Winsock reset";       Sel=$false; Level=1 }
            [pscustomobject]@{ Key="NA"; Short="DNS Gaming (1.1.1.1 Cloudflare)"; Sel=$false; Level=0 }
            [pscustomobject]@{ Key="NB"; Short="Large Send Offload (LSO) OFF";    Sel=$false; Level=1 }
            [pscustomobject]@{ Key="NC"; Short="Interrupt Moderation OFF";        Sel=$false; Level=2; Disclaimer="Peut augmenter fortement les interruptions CPU sur certains drivers reseau. A tester uniquement si vous savez revenir en arriere." }
            [pscustomobject]@{ Key="ND"; Short="Network Throttling OFF";          Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="NE"; Short="IPv6 desactive (adaptateurs)";    Sel=$false; Level=1 }
            [pscustomobject]@{ Key="NF"; Short="Teredo + 6to4 + ISATAP OFF";      Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="NG"; Short="Chimney Offload + NetDMA OFF";    Sel=$false; Level=1 }
            [pscustomobject]@{ Key="NH"; Short="NetBIOS over TCP/IP OFF";          Sel=$false; Level=1 }
            [pscustomobject]@{ Key="NI"; Short="DefaultTTL + TCP params avances"; Sel=$false; Level=1 }
            [pscustomobject]@{ Key="NJ"; Short="Packet Coalescing OFF + RSS ON";  Sel=$false; Level=2; Disclaimer="Peut augmenter la charge CPU selon la carte reseau. A tester uniquement apres mesure ping/jitter." }
        )
    }
    @{
        Name  = "Interface"
        Icon  = "UI"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="R"; Short="Xbox Game Bar + DVR OFF";         Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="S"; Short="Notifications OFF";               Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="T"; Short="Cortana desactive";               Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="U"; Short="Pointer Precision OFF (raw)";     Sel=$true;  Level=0 }
        )
    }
    @{
        Name  = "Services"
        Icon  = "SVC"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="X"; Short="Background Apps UWP OFF";         Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="Z"; Short="Windows Update OFF (session)";    Sel=$false; Level=1 }
        )
    }
    @{
        Name  = "Gaming"
        Icon  = "WZ"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="1"; Short="Game Mode Windows active";        Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="2"; Short="MMCSS Gaming Profile";            Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="3"; Short="CPU + IO Priority (COD/WZ/BO6)";  Sel=$true;  Level=0 }
            [pscustomobject]@{ Key="4"; Short="AppCompat Shim OFF";              Sel=$false; Level=1 }
        )
    }
    @{
        Name  = "Nettoyage"
        Icon  = "CLN"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="5"; Short="Temp + Prefetch + Corbeille";     Sel=$false; Level=1 }
            [pscustomobject]@{ Key="6"; Short="DNS + Winsock + IP renouvelee";   Sel=$false; Level=1 }
        )
    }
    @{
        Name  = "!! Avance"
        Icon  = "!!"
        IsAdv = $true
        Opts  = @(
            [pscustomobject]@{ Key="7"; Short="UAC desactive"; Sel=$false; Level=2
                Disclaimer="L UAC bloque l execution silencieuse de malware avec droits admin. Le desactiver expose le systeme a des infections sans alerte. Risque eleve sur tout PC connecte a internet." }
            [pscustomobject]@{ Key="8"; Short="Spectre / Meltdown OFF"; Sel=$false; Level=2
                Disclaimer="Protections hardware CPU contre la lecture memoire inter-processus. Gain : +5-15% perfs CPU. Risque : vulnerabilite kernel exploitable. Deconseille sur PC partage ou reseau non securise." }
            [pscustomobject]@{ Key="9"; Short="Defender Realtime OFF"; Sel=$false; Level=2
                Disclaimer="Desactive la protection antivirus temps reel. Tout fichier execute peut infecter le systeme sans detection. A utiliser seulement si un antivirus tiers tourne en parallele." }
            [pscustomobject]@{ Key="0"; Short="Core Isolation + VBS OFF"; Sel=$false; Level=2
                Disclaimer="Virtualisation Based Security protege le kernel Windows. La desactiver retire une couche de defense contre les rootkits et les exploits kernel. Gain de performances variable selon le GPU." }
        )
    }
    @{
        Name  = "Taches"
        Icon  = "TSK"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="TA"; Short="Application Experience OFF"; Sel=$false; Level=1 }
            [pscustomobject]@{ Key="TB"; Short="CEIP (telemetrie usage) OFF"; Sel=$false; Level=1 }
            [pscustomobject]@{ Key="TC"; Short="Diagnostic disque OFF";       Sel=$false; Level=1 }
            [pscustomobject]@{ Key="TD"; Short="Rapport d erreurs OFF";       Sel=$false; Level=1 }
            [pscustomobject]@{ Key="TE"; Short="Defragmentation planifiee OFF"; Sel=$false; Level=1 }
            [pscustomobject]@{ Key="TF"; Short="WinSAT + Efficacite OFF";     Sel=$false; Level=1 }
            [pscustomobject]@{ Key="TG"; Short="UpdateOrchestrator notif OFF"; Sel=$false; Level=1 }
        )
    }
    @{
        Name  = "Recovery"
        Icon  = "RC"
        IsAdv = $false
        Opts  = @(
            [pscustomobject]@{ Key="RCA"; Short="Plan Balanced (defaut Windows)";   Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCB"; Short="SysMain / Superfetch ON";          Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCC"; Short="Windows Update reactive";          Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCD"; Short="Hibernation reactive";             Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCE"; Short="IPv6 reactive (adaptateurs)";      Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCF"; Short="DNS automatique (DHCP)";           Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCG"; Short="Xbox Game Bar + DVR ON";           Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCH"; Short="Windows Defender Realtime ON";     Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCI"; Short="UAC reactive";                     Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCJ"; Short="Windows Search reactive";          Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCK"; Short="Cortana reactive";                 Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCL"; Short="Notifications reactives";          Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCM"; Short="Effets visuels + Animations ON";   Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCN"; Short="Background Apps UWP ON";           Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCO"; Short="Network Throttling ON (defaut)";   Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCP"; Short="Reset TCP/IP + Winsock complet";   Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCS"; Short="Services non-essentiels ON";       Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCT"; Short="Telemetrie + DiagTrack ON";        Sel=$false; Level=0 }
            [pscustomobject]@{ Key="RCU"; Short="Restaurer TOUS les services";      Sel=$false; Level=0 }
        )
    }
)

$script:allOpts   = @{}
$script:execOrder = @()
foreach ($g in $script:groups) {
    foreach ($o in $g.Opts) {
        $script:allOpts[$o.Key] = $o
        $script:execOrder      += $o.Key
    }
}

$script:recoveryKeys = @("RCA","RCB","RCC","RCD","RCE","RCF","RCG","RCH","RCI","RCJ","RCK","RCL","RCM","RCN","RCO","RCP","RCS","RCT","RCU")
$script:markerRoot = "HKCU:\Software\WZPRO\Optimizer\Applied"

function Mark-OptimizationApplied {
    param([string]$Key)
    if (-not (Test-Path $script:markerRoot)) { New-Item $script:markerRoot -Force | Out-Null }
    Set-ItemProperty $script:markerRoot -Name $Key -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Force -ErrorAction SilentlyContinue
}

function Test-OptimizationApplied {
    param([string]$Key)
    if (-not (Test-Path $script:markerRoot)) { return $false }
    $prop = (Get-ItemProperty $script:markerRoot -ErrorAction SilentlyContinue).PSObject.Properties[$Key]
    return [bool]$prop
}

function Clear-OptimizationMarkers {
    if (Test-Path $script:markerRoot) {
        Remove-Item $script:markerRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ================================================================
#  FONCTIONS D'OPTIMISATION
# ================================================================

function Run-A {
    ws "Plan Ultimate Performance"
    $g = "e9a42b02-d5df-448d-aa00-03f14749eb61"
    if (-not (powercfg /list | Select-String $g)) { powercfg /duplicatescheme $g | Out-Null }
    powercfg /setactive $g | Out-Null
    wo "Plan active"
}
function Run-B {
    ws "CPU Parking desactive"
    $k = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583"
    Set-ItemProperty $k -Name "ValueMax" -Value 0 -Type DWord -Force
    powercfg /setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100 | Out-Null
    powercfg /setactive SCHEME_CURRENT | Out-Null
    wo "Tous les coeurs CPU toujours actifs"
}
function Run-C {
    ws "SysMain / Superfetch OFF"
    Stop-Service SysMain -Force; Set-Service SysMain -StartupType Disabled
    wo "Service arrete"
}
function Run-D {
    ws "Timer precision + Dynamic Tick OFF"
    bcdedit /set disabledynamictick yes | Out-Null
    bcdedit /set tscsyncpolicy Enhanced | Out-Null
    wo "Dynamic Tick OFF applique - useplatformclock non force - reboot requis"
}
function Run-E {
    ws "Telemetrie + DiagTrack OFF"
    @("DiagTrack","dmwappushservice","WerSvc","PcaSvc","RetailDemo") | ForEach-Object {
        Stop-Service $_ -Force; Set-Service $_ -StartupType Disabled
    }
    $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "AllowTelemetry" -Value 0 -Type DWord -Force
    wo "Telemetrie desactivee"
}
function Run-F {
    ws "Hibernation OFF"
    powercfg /hibernate off | Out-Null
    wo "hiberfil.sys supprime"
}
function Run-G {
    ws "Pagefile optimise"
    $ram = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1MB)
    $init = [math]::Max(2048, $ram); $max = [math]::Min($ram * 2, 32768)
    $cs = Get-WmiObject Win32_ComputerSystem
    $cs.AutomaticManagedPagefile = $false; $cs.Put() | Out-Null
    $pf = Get-WmiObject Win32_PageFileSetting
    if ($pf) { $pf.InitialSize = $init; $pf.MaximumSize = $max; $pf.Put() | Out-Null }
    wo "${init} MB init / ${max} MB max (RAM : ${ram} MB)"
}
function Run-H {
    ws "Large System Cache OFF"
    Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" `
        -Name "LargeSystemCache" -Value 0 -Type DWord -Force
    wo "RAM liberee pour les jeux"
}
function Run-I {
    ws "Hardware GPU Scheduling (HAGS)"
    $p = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "HwSchMode" -Value 2 -Type DWord -Force
    wo "HAGS active - reboot requis"
}
function Run-J {
    ws "FullScreen Optimizations OFF"
    $b = "HKCU:\System\GameConfigStore"
    Set-ItemProperty $b -Name "GameDVR_FSEBehavior"                   -Value 2 -Type DWord -Force
    Set-ItemProperty $b -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -Type DWord -Force
    Set-ItemProperty $b -Name "GameDVR_FSEBehaviorMode"                -Value 2 -Type DWord -Force
    wo "FSO desactive"
}
function Run-K {
    ws "MSI Mode interruptions GPU"
    $class = "HKLM:\SYSTEM\CurrentControlSet\Enum"
    Get-WmiObject Win32_VideoController | ForEach-Object {
        if ($_.PNPDeviceID) {
            $p = "$class\$($_.PNPDeviceID)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
            if (Test-Path $p) { Set-ItemProperty $p -Name "MSISupported" -Value 1 -Type DWord -Force }
        }
    }
    wo "MSI Mode configure - reboot requis"
}
function Run-L {
    ws "Core Isolation / Memory Integrity OFF"
    $p = "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "Enabled" -Value 0 -Type DWord -Force
    ww "Desactive - reboot requis"
}
function Run-M {
    ws "Nagle off + TCP gaming"
    $ip = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces"
    Get-ChildItem $ip | ForEach-Object {
        Set-ItemProperty $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -Force
        Set-ItemProperty $_.PSPath -Name "TCPNoDelay"      -Value 1 -Type DWord -Force
        Set-ItemProperty $_.PSPath -Name "TcpDelAckTicks"  -Value 0 -Type DWord -Force
    }
    netsh int tcp set global autotuninglevel=normal  | Out-Null
    netsh int tcp set global congestionprovider=ctcp | Out-Null
    netsh int tcp set global ecncapability=disabled  | Out-Null
    netsh int tcp set global timestamps=disabled     | Out-Null
    netsh int tcp set global rss=enabled             | Out-Null
    wo "Nagle desactive + TCP optimise"
}
function Run-N {
    ws "Reseau power mgmt OFF"
    $class = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"
    Get-ChildItem $class -ErrorAction SilentlyContinue | ForEach-Object {
        if ((Get-ItemProperty $_.PSPath -Name "DriverDesc" -ErrorAction SilentlyContinue).DriverDesc) {
            Set-ItemProperty $_.PSPath -Name "PnPCapabilities" -Value 24 -Type DWord -Force
        }
    }
    wo "Power management reseau desactive"
}
function Run-O {
    ws "QoS OFF (100% bandwidth)"
    $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "NonBestEffortLimit" -Value 0 -Type DWord -Force
    wo "Reserve QoS liberee"
}
function Run-P {
    ws "Flush DNS + Winsock reset"
    ipconfig /flushdns | Out-Null; netsh winsock reset | Out-Null; netsh int ip reset | Out-Null
    wo "DNS vide + Winsock reinitialise"
}
function Run-Q {
    ws "Effets visuels OFF"
    $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "VisualFXSetting" -Value 2 -Type DWord -Force
    Set-ItemProperty "HKCU:\Control Panel\Desktop" -Name "UserPreferencesMask" `
        -Value ([byte[]](0x90,0x12,0x01,0x80)) -Type Binary -Force
    Set-ItemProperty "HKCU:\Control Panel\Desktop" -Name "MenuShowDelay" -Value "0" -Force
    wo "Effets visuels au minimum"
}
function Run-R {
    ws "Xbox Game Bar + DVR OFF"
    foreach ($p in @("HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR","HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR")) {
        if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
        Set-ItemProperty $p -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
    }
    Set-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force
    wo "Game Bar + DVR desactives"
}
function Run-S {
    ws "Notifications OFF"
    $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "ToastEnabled" -Value 0 -Type DWord -Force
    $p2 = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
    if (-not (Test-Path $p2)) { New-Item $p2 -Force | Out-Null }
    Set-ItemProperty $p2 -Name "DisableNotificationCenter" -Value 1 -Type DWord -Force
    wo "Notifications desactivees"
}
function Run-T {
    ws "Cortana desactive"
    $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "AllowCortana" -Value 0 -Type DWord -Force
    wo "Cortana desactive"
}
function Run-U {
    ws "Pointer Precision OFF"
    Set-ItemProperty "HKCU:\Control Panel\Mouse" -Name "MouseSpeed"      -Value "0" -Force
    Set-ItemProperty "HKCU:\Control Panel\Mouse" -Name "MouseThreshold1" -Value "0" -Force
    Set-ItemProperty "HKCU:\Control Panel\Mouse" -Name "MouseThreshold2" -Value "0" -Force
    wo "Input souris 100% raw"
}
function Run-V {
    ws "Transparence + Animations OFF"
    Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" `
        -Name "EnableTransparency" -Value 0 -Type DWord -Force
    Set-ItemProperty "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "0" -Force
    wo "Transparence et animations desactivees"
}
function Run-W {
    ws "Windows Search OFF"
    Stop-Service WSearch -Force; Set-Service WSearch -StartupType Disabled
    wo "Indexation arretee"
}
function Run-X {
    ws "Background Apps UWP OFF"
    $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "GlobalUserDisabled"        -Value 1 -Type DWord -Force
    Set-ItemProperty $p -Name "BackgroundAppGlobalToggle" -Value 0 -Type DWord -Force
    wo "Apps arriere-plan desactivees"
}
function Run-Y {
    ws "Services non-essentiels OFF"
    @("Fax","TabletInputService","WbioSrvc","icssvc","WMPNetworkSvc",
      "XblAuthManager","XblGameSave","XboxNetApiSvc") | ForEach-Object {
        Stop-Service $_ -Force; Set-Service $_ -StartupType Disabled
    }
    ww "Verifiez manette Xbox / imprimante si probleme"
}
function Run-Z {
    ws "Windows Update OFF (session)"
    Stop-Service wuauserv -Force; Set-Service wuauserv -StartupType Disabled
    ww "Pensez a le reactiver apres la session"
}
function Run-1 {
    ws "Game Mode Windows active"
    $p = "HKCU:\Software\Microsoft\GameBar"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force
    Set-ItemProperty $p -Name "AllowAutoGameMode"   -Value 1 -Type DWord -Force
    wo "Game Mode active"
}
function Run-2 {
    ws "MMCSS Gaming Profile"
    $b = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
    Set-ItemProperty $b -Name "SystemResponsiveness"   -Value 0         -Type DWord -Force
    Set-ItemProperty $b -Name "NetworkThrottlingIndex" -Value 0xffffffff -Type DWord -Force
    $g = "$b\Tasks\Games"
    if (-not (Test-Path $g)) { New-Item $g -Force | Out-Null }
    Set-ItemProperty $g -Name "GPU Priority"        -Value 8      -Type DWord -Force
    Set-ItemProperty $g -Name "Priority"            -Value 6      -Type DWord -Force
    Set-ItemProperty $g -Name "Clock Rate"          -Value 2710   -Type DWord -Force
    Set-ItemProperty $g -Name "Scheduling Category" -Value "High"             -Force
    Set-ItemProperty $g -Name "SFIO Priority"       -Value "High"             -Force
    wo "MMCSS profil gaming configure"
}
function Run-3 {
    ws "CPU + IO Priority (COD/WZ/BO6)"
    $b = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options"
    @("cod.exe","warzone.exe","ModernWarfare.exe","cod_launcher.exe","BlackOps6.exe","bo6.exe","s1_mp64_ship.exe") | ForEach-Object {
        $p = "$b\$_\PerfOptions"
        if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
        Set-ItemProperty $p -Name "CpuPriorityClass" -Value 3 -Type DWord -Force
        Set-ItemProperty $p -Name "IoPriority"       -Value 3 -Type DWord -Force
    }
    wo "CPU=High + IO=High configures"
}
function Run-4 {
    ws "AppCompatibility Shim OFF"
    $p = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "DisableEngine" -Value 1 -Type DWord -Force
    ww "Vieux logiciels peuvent dysfonctionner"
}
function Run-5 {
    ws "Nettoyage Temp + Corbeille"
    $total = 0
    @($env:TEMP,"C:\Windows\Temp","$env:LOCALAPPDATA\Temp") | ForEach-Object {
        if (Test-Path $_) {
            $sz = (Get-ChildItem $_ -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
            Remove-Item "$_\*" -Recurse -Force -ErrorAction SilentlyContinue
            $total += [math]::Round($sz / 1MB, 1)
        }
    }
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
    wo "$total MB liberes"
}
function Run-6 {
    ws "DNS + Winsock + IP renouvelee"
    ipconfig /flushdns | Out-Null; netsh winsock reset | Out-Null; netsh int ip reset | Out-Null
    ipconfig /release | Out-Null; ipconfig /renew | Out-Null
    wo "Reseau reinitialise"
}
function Run-7 {
    ws "UAC desactive"
    Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
        -Name "EnableLUA" -Value 0 -Type DWord -Force
    ww "UAC OFF - aucune protection admin automatique"
}
function Run-8 {
    ws "Mitigations Spectre / Meltdown OFF"
    $p = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
    Set-ItemProperty $p -Name "FeatureSettingsOverride"     -Value 3 -Type DWord -Force
    Set-ItemProperty $p -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord -Force
    ww "Mitigations CPU OFF - gain 5-15% - reboot requis"
}
function Run-9 {
    ws "Defender Realtime OFF"
    Set-MpPreference -DisableRealtimeMonitoring $true
    $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "DisableAntiSpyware" -Value 1 -Type DWord -Force
    $p2 = "$p\Real-Time Protection"
    if (-not (Test-Path $p2)) { New-Item $p2 -Force | Out-Null }
    Set-ItemProperty $p2 -Name "DisableRealtimeMonitoring" -Value 1 -Type DWord -Force
    Set-ItemProperty $p2 -Name "DisableBehaviorMonitoring" -Value 1 -Type DWord -Force
    ww "Defender OFF - aucun antivirus actif"
}
function Run-0 {
    ws "Core Isolation + VBS OFF"
    $p = "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "EnableVirtualizationBasedSecurity" -Value 0 -Type DWord -Force
    Set-ItemProperty $p -Name "RequirePlatformSecurityFeatures"   -Value 0 -Type DWord -Force
    $p2 = "$p\Scenarios\HypervisorEnforcedCodeIntegrity"
    if (-not (Test-Path $p2)) { New-Item $p2 -Force | Out-Null }
    Set-ItemProperty $p2 -Name "Enabled" -Value 0 -Type DWord -Force
    ww "Core Isolation + VBS OFF - reboot requis"
}
function Run-TA {
    ws "Application Experience tasks OFF"
    $path = "\Microsoft\Windows\Application Experience\"
    @("AitAgent","ProgramDataUpdater","StartupAppTask") | ForEach-Object {
        Disable-ScheduledTask -TaskPath $path -TaskName $_ -ErrorAction SilentlyContinue | Out-Null
    }
    wo "Application Experience taches desactivees"
}
function Run-TB {
    ws "CEIP tasks OFF"
    $path = "\Microsoft\Windows\Customer Experience Improvement Program\"
    @("Consolidator","UsbCeip","KernelCeipTask") | ForEach-Object {
        Disable-ScheduledTask -TaskPath $path -TaskName $_ -ErrorAction SilentlyContinue | Out-Null
    }
    wo "CEIP taches desactivees"
}
function Run-TC {
    ws "Disk Diagnostic task OFF"
    Disable-ScheduledTask -TaskPath "\Microsoft\Windows\DiskDiagnostic\" -TaskName "Microsoft-Windows-DiskDiagnosticDataCollector" -ErrorAction SilentlyContinue | Out-Null
    wo "Diagnostic disque desactive"
}
function Run-TD {
    ws "Windows Error Reporting task OFF"
    Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Windows Error Reporting\" -TaskName "QueueReporting" -ErrorAction SilentlyContinue | Out-Null
    wo "Rapport d erreurs desactive"
}
function Run-TE {
    ws "Defragmentation planifiee OFF"
    Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Defrag\" -TaskName "ScheduledDefrag" -ErrorAction SilentlyContinue | Out-Null
    wo "Defragmentation planifiee desactivee"
}
function Run-TF {
    ws "WinSAT + Power Efficiency OFF"
    Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Maintenance\" -TaskName "WinSAT" -ErrorAction SilentlyContinue | Out-Null
    Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Power Efficiency Diagnostics\" -TaskName "AnalyzeSystem" -ErrorAction SilentlyContinue | Out-Null
    wo "WinSAT et efficacite energetique desactives"
}
function Run-TG {
    ws "UpdateOrchestrator notifications OFF"
    @("UpdateNotificationTask","USO_UxBroker") | ForEach-Object {
        Disable-ScheduledTask -TaskPath "\Microsoft\Windows\UpdateOrchestrator\" -TaskName $_ -ErrorAction SilentlyContinue | Out-Null
    }
    wo "Notifications UpdateOrchestrator desactivees"
}

function Run-RCA {
    ws "Plan Balanced (defaut Windows)"
    powercfg /setactive SCHEME_BALANCED | Out-Null
    $k = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583"
    Set-ItemProperty $k -Name "ValueMax" -Value 100 -Type DWord -Force -ErrorAction SilentlyContinue
    powercfg /setacvalueindex SCHEME_BALANCED SUB_PROCESSOR CPMINCORES 5 | Out-Null
    powercfg /setdcvalueindex SCHEME_BALANCED SUB_PROCESSOR CPMINCORES 5 | Out-Null
    powercfg /setactive SCHEME_BALANCED | Out-Null
    wo "Plan Balanced active"
}
function Run-RCB {
    ws "SysMain / Superfetch ON"
    Set-Service SysMain -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service SysMain -ErrorAction SilentlyContinue
    wo "SysMain reactive"
}
function Run-RCC {
    ws "Windows Update reactive"
    Set-Service wuauserv -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service wuauserv -ErrorAction SilentlyContinue
    wo "Windows Update reactive"
}
function Run-RCD {
    ws "Hibernation reactive"
    powercfg /hibernate on | Out-Null
    wo "Hibernation reactive"
}
function Run-RCE {
    ws "IPv6 reactive sur tous les adaptateurs"
    Get-NetAdapter | ForEach-Object {
        Enable-NetAdapterBinding -Name $_.Name -ComponentID "ms_tcpip6" -ErrorAction SilentlyContinue
    }
    wo "IPv6 reactive"
}
function Run-RCF {
    ws "DNS automatique (DHCP)"
    Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
        Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ResetServerAddresses -ErrorAction SilentlyContinue
    }
    ipconfig /flushdns | Out-Null
    wo "DNS remis en automatique (DHCP)"
}
function Run-RCG {
    ws "Xbox Game Bar + DVR ON"
    $p1 = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
    $p2 = "HKCU:\System\GameConfigStore"
    if (-not (Test-Path $p1)) { New-Item $p1 -Force | Out-Null }
    if (-not (Test-Path $p2)) { New-Item $p2 -Force | Out-Null }
    Set-ItemProperty $p1 -Name "AppCaptureEnabled"        -Value 1 -Type DWord -Force
    Set-ItemProperty $p2 -Name "GameDVR_Enabled"          -Value 1 -Type DWord -Force
    Set-ItemProperty $p2 -Name "GameDVR_FSEBehaviorMode"  -Value 0 -Type DWord -Force
    wo "Xbox Game Bar + DVR reactive"
}
function Run-RCH {
    ws "Windows Defender Realtime ON"
    Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
    wo "Defender Realtime reactive"
}
function Run-RCI {
    ws "UAC reactive"
    $p = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
    Set-ItemProperty $p -Name "EnableLUA"                -Value 1 -Type DWord -Force
    Set-ItemProperty $p -Name "ConsentPromptBehaviorAdmin" -Value 5 -Type DWord -Force
    wo "UAC reactive - reboot recommande"
}
function Run-RCJ {
    ws "Windows Search reactive"
    Set-Service WSearch -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service WSearch -ErrorAction SilentlyContinue
    wo "Windows Search reactive"
}
function Run-RCK {
    ws "Cortana reactive"
    $p = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search"
    Set-ItemProperty $p -Name "CortanaConsent" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    wo "Cortana reactive"
}
function Run-RCL {
    ws "Notifications reactives"
    $p = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications"
    if (-not (Test-Path $p)) { New-Item $p -Force | Out-Null }
    Set-ItemProperty $p -Name "ToastEnabled" -Value 1 -Type DWord -Force
    wo "Notifications reactives"
}
function Run-RCM {
    ws "Effets visuels + Animations + Transparence ON"
    $p1 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
    $p2 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    $p3 = "HKCU:\Control Panel\Desktop"
    if (-not (Test-Path $p1)) { New-Item $p1 -Force | Out-Null }
    Set-ItemProperty $p1 -Name "VisualFXSetting"      -Value 1 -Type DWord -Force
    Set-ItemProperty $p2 -Name "EnableTransparency"   -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    Set-ItemProperty $p3 -Name "MenuShowDelay"        -Value "400" -Force
    wo "Effets visuels restaures - redemarrer l explorateur"
}
function Run-RCN {
    ws "Background Apps UWP ON"
    $p = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
    Set-ItemProperty $p -Name "GlobalUserDisabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
    wo "Background Apps UWP reactive"
}
function Run-RCO {
    ws "Network Throttling ON (defaut=10)"
    $p = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
    Set-ItemProperty $p -Name "NetworkThrottlingIndex" -Value 10 -Type DWord -Force
    wo "Network Throttling remis au defaut"
}
function Run-RCP {
    ws "Reset TCP/IP + Winsock complet"
    netsh int ip reset    | Out-Null
    netsh winsock reset   | Out-Null
    ipconfig /flushdns    | Out-Null
    ipconfig /release     | Out-Null
    ipconfig /renew       | Out-Null
    ww "Reset complet effectue - reboot requis"
}
function Run-RCS {
    ws "Services non-essentiels ON"
    @("Fax","TabletInputService","WbioSrvc","icssvc","WMPNetworkSvc",
      "XblAuthManager","XblGameSave","XboxNetApiSvc") | ForEach-Object {
        Set-Service $_ -StartupType Manual -ErrorAction SilentlyContinue
        Start-Service $_ -ErrorAction SilentlyContinue
    }
    wo "Services non-essentiels reactives"
}
function Run-RCT {
    ws "Telemetrie + DiagTrack ON"
    @("DiagTrack","dmwappushservice","WerSvc","PcaSvc","RetailDemo") | ForEach-Object {
        Set-Service $_ -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service $_ -ErrorAction SilentlyContinue
    }
    wo "Services telemetrie reactives"
}
function Run-RCU {
    ws "Restauration de TOUS les services modifies"
    Clear-OptimizationMarkers
    bcdedit /deletevalue disabledynamictick 2>$null | Out-Null
    bcdedit /deletevalue useplatformclock 2>$null | Out-Null
    bcdedit /deletevalue tscsyncpolicy 2>$null | Out-Null

    $cpuParkingKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583"
    Set-ItemProperty $cpuParkingKey -Name "ValueMax" -Value 100 -Type DWord -Force -ErrorAction SilentlyContinue
    powercfg /setactive SCHEME_BALANCED | Out-Null
    powercfg /setacvalueindex SCHEME_BALANCED SUB_PROCESSOR CPMINCORES 5 | Out-Null
    powercfg /setdcvalueindex SCHEME_BALANCED SUB_PROCESSOR CPMINCORES 5 | Out-Null
    powercfg /setactive SCHEME_BALANCED | Out-Null

    netsh int tcp set global autotuninglevel=normal 2>$null | Out-Null
    netsh int tcp set global ecncapability=default 2>$null | Out-Null
    netsh int tcp set global timestamps=default 2>$null | Out-Null
    netsh int tcp set global rss=enabled 2>$null | Out-Null
    netsh interface teredo set state default 2>$null | Out-Null
    netsh interface 6to4 set state default 2>$null | Out-Null
    netsh interface isatap set state default 2>$null | Out-Null

    $nicClass = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"
    Get-ChildItem $nicClass -ErrorAction SilentlyContinue | ForEach-Object {
        Set-ItemProperty $_.PSPath -Name "*InterruptModeration" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*LsoV2IPv4" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*LsoV2IPv6" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*LsoV1IPv4" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*PacketCoalescing" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    }
    Get-NetAdapter | ForEach-Object {
        Enable-NetAdapterBinding -Name $_.Name -ComponentID "ms_tcpip6" -ErrorAction SilentlyContinue
    }

    $svcManual = @(
        "Fax","TabletInputService","WbioSrvc","icssvc","WMPNetworkSvc",
        "XblAuthManager","XblGameSave","XboxNetApiSvc",
        "dmwappushservice","WerSvc","PcaSvc","RetailDemo","wuauserv"
    )
    $svcAuto = @("SysMain","DiagTrack")
    $svcAutoDelayed = @("WSearch")
    foreach ($s in $svcManual) {
        Set-Service $s -StartupType Manual -ErrorAction SilentlyContinue
        Start-Service $s -ErrorAction SilentlyContinue
    }
    foreach ($s in $svcAuto) {
        Set-Service $s -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service $s -ErrorAction SilentlyContinue
    }
    foreach ($s in $svcAutoDelayed) {
        Set-Service $s -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service $s -ErrorAction SilentlyContinue
    }
    wo "Services, timers, CPU parking et reseau restaures aux valeurs Windows stables"
}

function Run-NA {
    ws "DNS Gaming - Cloudflare 1.1.1.1"
    Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
        Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ServerAddresses @("1.1.1.1","1.0.0.1") -ErrorAction SilentlyContinue
    }
    ipconfig /flushdns | Out-Null
    wo "DNS configure sur 1.1.1.1 / 1.0.0.1"
}
function Run-NB {
    ws "Large Send Offload (LSO) OFF"
    $class = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"
    Get-ChildItem $class -ErrorAction SilentlyContinue | ForEach-Object {
        Set-ItemProperty $_.PSPath -Name "*LsoV2IPv4" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*LsoV2IPv6" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*LsoV1IPv4" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
    }
    wo "LSO desactive"
}
function Run-NC {
    ws "Interrupt Moderation OFF"
    $class = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"
    Get-ChildItem $class -ErrorAction SilentlyContinue | ForEach-Object {
        Set-ItemProperty $_.PSPath -Name "*InterruptModeration" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
    }
    wo "Interrupt Moderation desactive"
}
function Run-ND {
    ws "Network Throttling OFF"
    $p = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
    Set-ItemProperty $p -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Type DWord -Force
    wo "Throttling reseau supprime"
}
function Run-NE {
    ws "IPv6 desactive sur tous les adaptateurs"
    Get-NetAdapter | ForEach-Object {
        Disable-NetAdapterBinding -Name $_.Name -ComponentID "ms_tcpip6" -ErrorAction SilentlyContinue
    }
    wo "IPv6 desactive"
}
function Run-NF {
    ws "Teredo + 6to4 + ISATAP OFF"
    netsh interface teredo set state disabled  | Out-Null
    netsh interface 6to4 set state disabled    | Out-Null
    netsh interface isatap set state disabled  | Out-Null
    wo "Tunnels IPv6 desactives"
}
function Run-NG {
    ws "Chimney Offload + NetDMA OFF"
    netsh int tcp set global chimney=disabled | Out-Null
    netsh int tcp set global netdma=disabled  | Out-Null
    wo "Chimney Offload + NetDMA desactives"
}
function Run-NH {
    ws "NetBIOS over TCP/IP OFF"
    Get-WmiObject -Class Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPEnabled } | ForEach-Object { $_.SetTcpipNetbios(2) | Out-Null }
    wo "NetBIOS over TCP/IP desactive"
}
function Run-NI {
    ws "DefaultTTL + TCP params avances"
    $p = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
    Set-ItemProperty $p -Name "DefaultTTL"            -Value 64    -Type DWord -Force
    Set-ItemProperty $p -Name "GlobalMaxTcpWindowSize" -Value 65535 -Type DWord -Force
    Set-ItemProperty $p -Name "TcpMaxDupAcks"         -Value 2     -Type DWord -Force
    Set-ItemProperty $p -Name "SynAttackProtect"       -Value 0     -Type DWord -Force
    Set-ItemProperty $p -Name "Tcp1323Opts"            -Value 1     -Type DWord -Force
    wo "Parametres TCP avances appliques"
}
function Run-NJ {
    ws "Packet Coalescing OFF + RSS ON"
    $class = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"
    Get-ChildItem $class -ErrorAction SilentlyContinue | ForEach-Object {
        Set-ItemProperty $_.PSPath -Name "*PacketCoalescing" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty $_.PSPath -Name "*RSS"              -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    }
    netsh int tcp set global rss=enabled | Out-Null
    wo "Packet Coalescing OFF + RSS active"
}

$script:dispatch = @{
    "A"={Run-A}; "B"={Run-B}; "C"={Run-C}; "D"={Run-D}; "E"={Run-E}; "F"={Run-F}
    "G"={Run-G}; "H"={Run-H}; "I"={Run-I}; "J"={Run-J}; "K"={Run-K}; "L"={Run-L}
    "M"={Run-M}; "N"={Run-N}; "O"={Run-O}; "P"={Run-P}; "Q"={Run-Q}; "R"={Run-R}
    "S"={Run-S}; "T"={Run-T}; "U"={Run-U}; "V"={Run-V}; "W"={Run-W}; "X"={Run-X}
    "Y"={Run-Y}; "Z"={Run-Z}; "1"={Run-1}; "2"={Run-2}; "3"={Run-3}; "4"={Run-4}
    "5"={Run-5}; "6"={Run-6}; "7"={Run-7}; "8"={Run-8}; "9"={Run-9}; "0"={Run-0}
    "NA"={Run-NA};  "NB"={Run-NB};  "NC"={Run-NC};  "ND"={Run-ND};  "NE"={Run-NE}
    "NF"={Run-NF};  "NG"={Run-NG};  "NH"={Run-NH};  "NI"={Run-NI};  "NJ"={Run-NJ}
    "RCA"={Run-RCA}; "RCB"={Run-RCB}; "RCC"={Run-RCC}; "RCD"={Run-RCD}; "RCE"={Run-RCE}
    "RCF"={Run-RCF}; "RCG"={Run-RCG}; "RCH"={Run-RCH}; "RCI"={Run-RCI}; "RCJ"={Run-RCJ}
    "RCK"={Run-RCK}; "RCL"={Run-RCL}; "RCM"={Run-RCM}; "RCN"={Run-RCN}; "RCO"={Run-RCO}
    "RCP"={Run-RCP}; "RCS"={Run-RCS}; "RCT"={Run-RCT}; "RCU"={Run-RCU}
    "TA"={Run-TA}; "TB"={Run-TB}; "TC"={Run-TC}; "TD"={Run-TD}
    "TE"={Run-TE}; "TF"={Run-TF}; "TG"={Run-TG}
}

$script:presets = @{
    TOURNOI   = @("A","H","I","J","N","R","S","U","1","2","3","ND","NF")
    STREAMING = @("A","H","I","N","S","U","1","2","ND","NF")
    MAXPERF   = @("A","B","C","E","F","H","I","J","K","M","N","O","R","S","T","U","X","1","2","3","NB","ND","NF","TA","TB","TD","TG")
}

$script:diagFns = @{
    "A" = { if ((powercfg /getactivescheme) -match "e9a42b02-d5df-448d-aa00-03f14749eb61") {"ACTIVE"} else {"INACTIVE"} }
    "B" = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583" -EA SilentlyContinue).ValueMax; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "C" = { if((Get-Service SysMain -EA SilentlyContinue).StartType -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "D" = { $r=bcdedit /enum `{current`} 2>$null; if(($r | Select-String "disabledynamictick") -and ($r | Select-String "tscsyncpolicy")){"ACTIVE"}else{"INACTIVE"} }
    "E" = { if((Get-Service DiagTrack -EA SilentlyContinue).StartType -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "F" = { $r=powercfg /a 2>$null; if(-not ($r | Select-String "Hibernate")){"ACTIVE"}else{"INACTIVE"} }
    "G" = { $pf=Get-WmiObject Win32_PageFileSetting -EA SilentlyContinue; if($pf -and $pf.InitialSize -gt 0 -and $pf.InitialSize -eq $pf.MaximumSize){"ACTIVE"}else{"INACTIVE"} }
    "H" = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -EA SilentlyContinue).LargeSystemCache; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "I" = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -EA SilentlyContinue).HwSchMode; if($v -eq 2){"ACTIVE"}else{"INACTIVE"} }
    "J" = { $v=(Get-ItemProperty "HKCU:\System\GameConfigStore" -EA SilentlyContinue).GameDVR_FSEBehaviorMode; if($v -eq 2){"ACTIVE"}else{"INACTIVE"} }
    "K" = { $gpu=Get-WmiObject Win32_VideoController -EA SilentlyContinue | Select-Object -First 1; if($gpu){ $path="HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.PNPDeviceID)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"; $v=(Get-ItemProperty $path -EA SilentlyContinue).MSISupported; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }else{"UNKNOWN"} }
    "L" = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -EA SilentlyContinue).Enabled; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "M" = { "UNKNOWN" }
    "N" = { "UNKNOWN" }
    "O" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" -EA SilentlyContinue).NonBestEffortLimit; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "P" = { "UNKNOWN" }
    "Q" = { $v=(Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -EA SilentlyContinue).VisualFXSetting; if($v -eq 2){"ACTIVE"}else{"INACTIVE"} }
    "R" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -EA SilentlyContinue).AppCaptureEnabled; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "S" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications" -EA SilentlyContinue).ToastEnabled; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "T" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -EA SilentlyContinue).AllowCortana; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "U" = { $v=(Get-ItemProperty "HKCU:\Control Panel\Mouse" -EA SilentlyContinue).MouseSpeed; if($v -eq "0"){"ACTIVE"}else{"INACTIVE"} }
    "V" = { $v=(Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -EA SilentlyContinue).EnableTransparency; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "W" = { if((Get-Service WSearch -EA SilentlyContinue).StartType -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "X" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -EA SilentlyContinue).GlobalUserDisabled; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "Y" = { "UNKNOWN" }
    "Z" = { if((Get-Service wuauserv -EA SilentlyContinue).StartType -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "1" = { $v=(Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" -EA SilentlyContinue).AllowAutoGameMode; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "2" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" -EA SilentlyContinue).Priority; if($v -eq 6){"ACTIVE"}else{"INACTIVE"} }
    "3" = { "UNKNOWN" }
    "4" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags" -EA SilentlyContinue).DisableEngine; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "5" = { "UNKNOWN" }
    "6" = { "UNKNOWN" }
    "7" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -EA SilentlyContinue).EnableLUA; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "8" = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -EA SilentlyContinue).FeatureSettingsOverrideMask; if($v -eq 3){"ACTIVE"}else{"INACTIVE"} }
    "9" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection" -EA SilentlyContinue).DisableRealtimeMonitoring; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "0"  = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" -EA SilentlyContinue).EnableVirtualizationBasedSecurity; if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "NA" = { $a=Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1; if($a){ $dns=(Get-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -AddressFamily IPv4 -EA SilentlyContinue).ServerAddresses; if($dns -contains "1.1.1.1"){"ACTIVE"}else{"INACTIVE"} }else{"UNKNOWN"} }
    "NB" = { $class="HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"; $v=(Get-ChildItem $class -EA SilentlyContinue | ForEach-Object { (Get-ItemProperty $_.PSPath -Name "*LsoV2IPv4" -EA SilentlyContinue)."*LsoV2IPv4" } | Where-Object {$_ -ne $null} | Select-Object -First 1); if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "NC" = { $class="HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"; $v=(Get-ChildItem $class -EA SilentlyContinue | ForEach-Object { (Get-ItemProperty $_.PSPath -Name "*InterruptModeration" -EA SilentlyContinue)."*InterruptModeration" } | Where-Object {$_ -ne $null} | Select-Object -First 1); if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "ND" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -EA SilentlyContinue).NetworkThrottlingIndex; if($v -eq 4294967295){"ACTIVE"}else{"INACTIVE"} }
    "NE" = { $a=Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1; if($a){ $b=Get-NetAdapterBinding -Name $a.Name -ComponentID "ms_tcpip6" -EA SilentlyContinue; if($b -and -not $b.Enabled){"ACTIVE"}else{"INACTIVE"} }else{"UNKNOWN"} }
    "NF" = { $t=(netsh interface teredo show state 2>$null | Select-String "Type\s*:\s*disabled"); if($t){"ACTIVE"}else{"INACTIVE"} }
    "NG" = { $r=netsh int tcp show global 2>$null; if(($r | Select-String "Chimney Offload.*disabled")){"ACTIVE"}else{"INACTIVE"} }
    "NH" = { $c=Get-WmiObject Win32_NetworkAdapterConfiguration -EA SilentlyContinue | Where-Object {$_.IPEnabled} | Select-Object -First 1; if($c -and $c.TcpipNetbiosOptions -eq 2){"ACTIVE"}else{"INACTIVE"} }
    "NI" = { $v=(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -EA SilentlyContinue).DefaultTTL; if($v -eq 64){"ACTIVE"}else{"INACTIVE"} }
    "NJ"  = { $class="HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002BE10318}"; $v=(Get-ChildItem $class -EA SilentlyContinue | ForEach-Object { (Get-ItemProperty $_.PSPath -Name "*PacketCoalescing" -EA SilentlyContinue)."*PacketCoalescing" } | Where-Object {$_ -ne $null} | Select-Object -First 1); if($v -eq 0){"ACTIVE"}else{"INACTIVE"} }
    "RCA" = { $s=powercfg /getactivescheme 2>$null; if($s -match "381b4222-f694-41f0-9685-ff5bb260df2e"){"ACTIVE"}else{"INACTIVE"} }
    "RCB" = { if((Get-Service SysMain -EA SilentlyContinue).StartType -eq "Automatic"){"ACTIVE"}else{"INACTIVE"} }
    "RCC" = { if((Get-Service wuauserv -EA SilentlyContinue).StartType -eq "Automatic"){"ACTIVE"}else{"INACTIVE"} }
    "RCD" = { $r=powercfg /a 2>$null; if($r | Select-String "Hibernate"){"ACTIVE"}else{"INACTIVE"} }
    "RCE" = { $a=Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1; if($a){ $b=Get-NetAdapterBinding -Name $a.Name -ComponentID "ms_tcpip6" -EA SilentlyContinue; if($b -and $b.Enabled){"ACTIVE"}else{"INACTIVE"} }else{"UNKNOWN"} }
    "RCF" = { $a=Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1; if($a){ $dns=(Get-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -AddressFamily IPv4 -EA SilentlyContinue).ServerAddresses; if(-not $dns -or $dns.Count -eq 0){"ACTIVE"}else{"INACTIVE"} }else{"UNKNOWN"} }
    "RCG" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -EA SilentlyContinue).AppCaptureEnabled; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "RCH" = { $v=(Get-MpPreference -EA SilentlyContinue).DisableRealtimeMonitoring; if($v -eq $false){"ACTIVE"}else{"INACTIVE"} }
    "RCI" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -EA SilentlyContinue).EnableLUA; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "RCJ" = { if((Get-Service WSearch -EA SilentlyContinue).StartType -eq "Automatic"){"ACTIVE"}else{"INACTIVE"} }
    "RCK" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -EA SilentlyContinue).CortanaConsent; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "RCL" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications" -EA SilentlyContinue).ToastEnabled; if($v -eq 1 -or $v -eq $null){"ACTIVE"}else{"INACTIVE"} }
    "RCM" = { $v=(Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -EA SilentlyContinue).EnableTransparency; if($v -eq 1){"ACTIVE"}else{"INACTIVE"} }
    "RCN" = { $v=(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -EA SilentlyContinue).GlobalUserDisabled; if($v -eq 0 -or $v -eq $null){"ACTIVE"}else{"INACTIVE"} }
    "RCO" = { $v=(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -EA SilentlyContinue).NetworkThrottlingIndex; if($v -eq 10 -or $v -eq $null){"ACTIVE"}else{"INACTIVE"} }
    "RCP" = { "UNKNOWN" }
    "RCS" = { $s=Get-Service XblAuthManager -EA SilentlyContinue; if($s -and $s.StartType -ne "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "RCT" = { $s=Get-Service DiagTrack -EA SilentlyContinue; if($s -and $s.StartType -ne "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "RCU" = { $all=@("SysMain","WSearch","DiagTrack","XblAuthManager","wuauserv"); $ok=$all | Where-Object { (Get-Service $_ -EA SilentlyContinue).StartType -ne "Disabled" }; if($ok.Count -eq $all.Count){"ACTIVE"}else{"INACTIVE"} }
    "TA"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\Application Experience\" -TaskName "AitAgent" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "TB"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\Customer Experience Improvement Program\" -TaskName "Consolidator" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "TC"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\DiskDiagnostic\" -TaskName "Microsoft-Windows-DiskDiagnosticDataCollector" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "TD"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\Windows Error Reporting\" -TaskName "QueueReporting" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "TE"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\Defrag\" -TaskName "ScheduledDefrag" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "TF"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\Maintenance\" -TaskName "WinSAT" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
    "TG"  = { $t=Get-ScheduledTask -TaskPath "\Microsoft\Windows\UpdateOrchestrator\" -TaskName "UpdateNotificationTask" -EA SilentlyContinue; if($t -and $t.State -eq "Disabled"){"ACTIVE"}else{"INACTIVE"} }
}

function Invoke-CliMode {
    param([string]$SelectedMode)
    $script:str = $script:strings["EN"]
    $s = $script:str

    $keys = switch ($SelectedMode) {
        "Safe"        { $script:execOrder | Where-Object { $script:allOpts[$_].Level -eq 0 -and $script:allOpts[$_].Sel -eq $true } }
        "Tournament"  { $script:presets.TOURNOI }
        "Streaming"   { $script:presets.STREAMING }
        "MaxPerf"     { $script:presets.MAXPERF }
        "Restore"     { @("RCU") }
        "Diagnostics" { @() }
        default       { @() }
    }

    Write-Host "WZ PRO // MODE $SelectedMode"
    Write-Host "Advice: apply a few options, reboot Windows, then test before applying more. Do not apply everything at once."

    if ($SelectedMode -eq "Diagnostics") {
        foreach ($k in $script:execOrder) {
            if (-not $script:diagFns.ContainsKey($k)) { continue }
            $name = if ($script:allOpts.ContainsKey($k)) { $script:allOpts[$k].Short } else { $k }
            $state = try { & $script:diagFns[$k] } catch { "UNKNOWN" }
            if (($state -eq "UNKNOWN" -or $state -eq "INACTIVE") -and (Test-OptimizationApplied $k)) {
                $state = "APPLIED"
            }
            Write-Host ("{0,-4} {1,-42} {2}" -f $k, $name, $state)
        }
        return
    }

    try {
        Enable-ComputerRestore -Drive "C:\" -ErrorAction Stop
        Checkpoint-Computer -Description "WZ PRO CLI - $(Get-Date -f 'yyyy-MM-dd HH:mm')" `
            -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
        wo $s.LogRestore
    } catch {
        ww $s.CliRestoreFail
    }

    foreach ($k in $keys) {
        if (-not $script:dispatch.ContainsKey($k)) {
            ww ($s.CliUnknownOpt -f $k)
            continue
        }
        try {
            & $script:dispatch[$k]
            Mark-OptimizationApplied $k
        } catch {
            ww ($s.CliOptErrorFmt -f $k, $_.Exception.Message)
        }
    }

    Write-Host $s.CliDone
}

if ($Mode -ne "Gui") {
    Invoke-CliMode $Mode
    exit
}

# ================================================================
#  XAML  -  THEME TACTICAL
# ================================================================

[xml]$xaml = @'
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="WZ PRO  //  GAMING OPTIMIZER"
    Width="980" Height="720"
    MinWidth="760" MinHeight="600"
    WindowStartupLocation="CenterScreen"
    Background="#f4f4ef"
    FontFamily="Consolas">

  <Window.Resources>
    <!-- Couleurs dynamiques des onglets -->
    <SolidColorBrush x:Key="TabBgInact" Color="#f4f4ef"/>
    <SolidColorBrush x:Key="TabBgAct"   Color="#ffffff"/>
    <SolidColorBrush x:Key="TabBgHov"   Color="#eaeaf5"/>
    <SolidColorBrush x:Key="TabFgInact" Color="#b0b0c0"/>
    <SolidColorBrush x:Key="TabFgAct"   Color="#1E1EFF"/>
    <SolidColorBrush x:Key="TabFgHov"   Color="#4040cc"/>
    <Style TargetType="TabControl">
      <Setter Property="Background" Value="{DynamicResource TabBgInact}"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Padding" Value="0"/>
    </Style>

    <Style TargetType="TabItem">
      <Setter Property="Background" Value="{DynamicResource TabBgInact}"/>
      <Setter Property="Foreground" Value="{DynamicResource TabFgInact}"/>
      <Setter Property="FontFamily" Value="Consolas"/>
      <Setter Property="FontSize" Value="10"/>
      <Setter Property="Padding" Value="10,5"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="TabItem">
            <Border x:Name="Bd"
                    Background="{TemplateBinding Background}"
                    BorderBrush="#1E1EFF"
                    BorderThickness="0"
                    Padding="{TemplateBinding Padding}">
              <ContentPresenter ContentSource="Header"
                                HorizontalAlignment="Left"
                                VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsSelected" Value="True">
                <Setter TargetName="Bd" Property="Background" Value="{DynamicResource TabBgAct}"/>
                <Setter TargetName="Bd" Property="BorderThickness" Value="2,0,0,0"/>
                <Setter Property="Foreground" Value="{DynamicResource TabFgAct}"/>
              </Trigger>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Bd" Property="Background" Value="{DynamicResource TabBgHov}"/>
                <Setter Property="Foreground" Value="{DynamicResource TabFgHov}"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style TargetType="Button">
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="FontFamily" Value="Consolas"/>
      <Setter Property="FontSize" Value="11"/>
      <Setter Property="Padding" Value="14,7"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="BtnBd"
                    Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}"
                    BorderThickness="{TemplateBinding BorderThickness}"
                    CornerRadius="0"
                    Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="BtnBd" Property="Opacity" Value="0.75"/>
              </Trigger>
              <Trigger Property="IsPressed" Value="True">
                <Setter TargetName="BtnBd" Property="Opacity" Value="0.5"/>
              </Trigger>
              <Trigger Property="IsEnabled" Value="False">
                <Setter TargetName="BtnBd" Property="Opacity" Value="0.35"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style TargetType="ScrollBar">
      <Setter Property="Width" Value="4"/>
      <Setter Property="Background" Value="#e8e8e2"/>
    </Style>

  </Window.Resources>

  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition Height="3"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="82"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <!-- ===== BG GRILLE (couvre toutes les lignes) ===== -->
    <Rectangle x:Name="BgRect" Grid.Row="0" Grid.RowSpan="6" Panel.ZIndex="0">
      <Rectangle.Fill>
        <DrawingBrush TileMode="Tile"
                      Viewport="0,0,40,40" ViewportUnits="Absolute"
                      Viewbox="0,0,40,40"  ViewboxUnits="Absolute">
          <DrawingBrush.Drawing>
            <DrawingGroup>
              <GeometryDrawing Brush="#f4f4ef">
                <GeometryDrawing.Geometry>
                  <RectangleGeometry Rect="0,0,40,40"/>
                </GeometryDrawing.Geometry>
              </GeometryDrawing>
              <GeometryDrawing>
                <GeometryDrawing.Pen>
                  <Pen Brush="#e2e2da" Thickness="0.5"/>
                </GeometryDrawing.Pen>
                <GeometryDrawing.Geometry>
                  <RectangleGeometry Rect="0,0,40,40"/>
                </GeometryDrawing.Geometry>
              </GeometryDrawing>
            </DrawingGroup>
          </DrawingBrush.Drawing>
        </DrawingBrush>
      </Rectangle.Fill>
    </Rectangle>

    <!-- ===== SYMBOLES TACTIQUES ARRIERE-PLAN ===== -->
    <Canvas x:Name="SymbolCanvas" Grid.Row="0" Grid.RowSpan="6" Panel.ZIndex="1"
            IsHitTestVisible="False" Opacity="0.07">
      <TextBlock Canvas.Left="20"  Canvas.Top="180" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="// WAR TECHNICAL SYSTEM"/>
      <TextBlock Canvas.Left="680" Canvas.Top="230" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="BALLISTIC INTEL // ACTIVE"/>
      <TextBlock Canvas.Left="110" Canvas.Top="390" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="GRID-04-7E // SECTOR-BRAVO"/>
      <TextBlock Canvas.Left="510" Canvas.Top="470" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="TARGET DESIGNATION: ONLINE"/>
      <TextBlock Canvas.Left="170" Canvas.Top="570" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="SYS.STATUS: OPERATIONAL"/>
      <TextBlock Canvas.Left="640" Canvas.Top="350" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="MATCHDATA // WARZONE ACTIVE"/>
      <TextBlock Canvas.Left="55"  Canvas.Top="510" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="PERFORMANCE ENGINE v2.4"/>
      <TextBlock Canvas.Left="760" Canvas.Top="140" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="OPERATOR INTEL: CONFIRMED"/>
      <TextBlock Canvas.Left="290" Canvas.Top="660" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="// CONTACT: ALPHA SQUAD"/>
      <TextBlock Canvas.Left="550" Canvas.Top="600" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="THEATER: AL MAZRAH"/>
      <TextBlock Canvas.Left="360" Canvas.Top="310" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="FREQUENCY: 156.800 MHz"/>
      <TextBlock Canvas.Left="820" Canvas.Top="440" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="SQUAD LINK: ACTIVE"/>
      <TextBlock Canvas.Left="430" Canvas.Top="200" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="UTC-04  22:08  //  SEASON 4"/>
      <TextBlock Canvas.Left="70"  Canvas.Top="700" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="PRECISION CALIBRATION: OK"/>
      <TextBlock Canvas.Left="700" Canvas.Top="620" FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Text="MAP CONTROL: ENGAGED"/>
      <!-- Croix de ciblage -->
      <TextBlock Canvas.Left="590" Canvas.Top="268" FontFamily="Consolas" FontSize="16" Foreground="#1E1EFF" Text="+"/>
      <TextBlock Canvas.Left="145" Canvas.Top="445" FontFamily="Consolas" FontSize="16" Foreground="#1E1EFF" Text="+"/>
      <TextBlock Canvas.Left="865" Canvas.Top="545" FontFamily="Consolas" FontSize="16" Foreground="#1E1EFF" Text="+"/>
      <TextBlock Canvas.Left="405" Canvas.Top="185" FontFamily="Consolas" FontSize="16" Foreground="#1E1EFF" Text="+"/>
      <TextBlock Canvas.Left="250" Canvas.Top="530" FontFamily="Consolas" FontSize="16" Foreground="#1E1EFF" Text="+"/>
    </Canvas>

    <!-- ===== BANDE BLEUE TOP ===== -->
    <Rectangle Grid.Row="0" Panel.ZIndex="2" Fill="#1E1EFF"/>

    <!-- ===== HEADER ===== -->
    <Border x:Name="HeaderBorder" Grid.Row="1" Panel.ZIndex="2"
            Background="#ffffff"
            BorderBrush="#e0e0d8" BorderThickness="0,0,0,1"
            Padding="26,18,26,18">
      <Grid>
        <Grid.ColumnDefinitions>
          <ColumnDefinition Width="*"/>
          <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>

        <StackPanel Grid.Column="0" VerticalAlignment="Center">
          <TextBlock FontFamily="Consolas" FontSize="30" FontWeight="Bold">
            <Run Text="WZ " Foreground="#1E1EFF"/>
            <Run Text="PRO" Foreground="#0a0a14"/>
          </TextBlock>
          <StackPanel Orientation="Horizontal" Margin="0,6,0,0">
            <Rectangle x:Name="SubSep1" Width="20" Height="1" Fill="#1E1EFF" VerticalAlignment="Center" Margin="0,0,10,0"/>
            <TextBlock x:Name="SubtitleTb" Text="GAMING OPTIMIZER  //  FULL PERFORMANCE BOOST"
                       FontFamily="Consolas" FontSize="10" Foreground="#b0b0c0"
                       VerticalAlignment="Center"/>
            <Rectangle x:Name="SubSep2" Width="20" Height="1" Fill="#1E1EFF" VerticalAlignment="Center" Margin="10,0,0,0"/>
          </StackPanel>
          <StackPanel Orientation="Horizontal" Margin="0,5,0,0">
            <TextBlock x:Name="SysInfoTb" FontFamily="Consolas" FontSize="9" Foreground="#a0a0b0" Text=""/>
            <TextBlock x:Name="ScoreTb"   FontFamily="Consolas" FontSize="9" Foreground="#1E1EFF" Margin="20,0,0,0" Text=""/>
          </StackPanel>
        </StackPanel>

        <Border x:Name="LegendBorder" Grid.Column="1" VerticalAlignment="Center"
                Background="#f8f8f3"
                BorderBrush="#e0e0d8" BorderThickness="1"
                Padding="16,10">
          <StackPanel>
            <TextBlock x:Name="LegendTb" FontFamily="Consolas" FontSize="10" TextAlignment="Right">
              <Run Text="[ # ] " Foreground="#1E1EFF"/>
              <Run Text="SAFE    " Foreground="#b0b0c0"/>
              <Run Text="[ ! ] " Foreground="#cc6600"/>
              <Run Text="BEHAVIOR    " Foreground="#b0b0c0"/>
              <Run Text="[ !! ] " Foreground="#cc0000"/>
              <Run Text="INTEGRITY" Foreground="#b0b0c0"/>
            </TextBlock>
            <TextBlock x:Name="LegendHintTb" FontFamily="Consolas" FontSize="9" Foreground="#c8c8c0"
                       TextAlignment="Right" Margin="0,5,0,0"
                       Text="HOVER AN OPTION FOR DETAILS"/>
          </StackPanel>
        </Border>
      </Grid>
    </Border>

    <!-- ===== TOOLBAR ===== -->
    <Border x:Name="ToolbarBorder" Grid.Row="2" Panel.ZIndex="2"
            Background="#ffffff"
            BorderBrush="#e0e0d8" BorderThickness="0,0,0,1"
            Padding="18,8,18,8">
      <StackPanel Orientation="Vertical">
        <TextBlock x:Name="SelectionLabel" Text="SELECTION :" Foreground="#c8c8c8" FontSize="9"
                   Margin="0,0,0,5"/>

        <!-- Boutons en WrapPanel pour eviter les chevauchements en VM basse resolution -->
        <WrapPanel Orientation="Horizontal" ItemHeight="32">
          <Button x:Name="BtnAll"  Content="CHECK ALL"
                  Background="#1E1EFF" Foreground="#ffffff"
                  BorderBrush="#1E1EFF" Margin="0,0,6,6" MinWidth="92"/>
          <Button x:Name="BtnSafe" Content="SAFE ONLY"
                  Background="#ffffff" Foreground="#1E1EFF"
                  BorderBrush="#1E1EFF" Margin="0,0,6,6" MinWidth="112"/>
          <Button x:Name="BtnNone" Content="UNCHECK ALL"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,14,6" MinWidth="112"/>
          <Button x:Name="BtnTournoi" Content="TOURNAMENT"
                  Background="#0044cc" Foreground="#ffffff"
                  BorderBrush="#0044cc" Margin="0,0,6,6" MinWidth="78"/>
          <Button x:Name="BtnStream" Content="STREAMING"
                  Background="#ffffff" Foreground="#cc6600"
                  BorderBrush="#cc6600" Margin="0,0,6,6" MinWidth="92"/>
          <Button x:Name="BtnMaxPerf" Content="MAX PERF"
                  Background="#cc0000" Foreground="#ffffff"
                  BorderBrush="#cc0000" Margin="0,0,14,6" MinWidth="78"/>
          <Button x:Name="BtnSaveProfil" Content="SAVE PROFILE"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,6,6" MinWidth="96"/>
          <Button x:Name="BtnLoadProfil" Content="LOAD PROFILE"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,6,6" MinWidth="96"/>
          <Button x:Name="BtnTheme"
                  Content="DARK MODE"
                  Background="#f4f4ef" Foreground="#b0b0c0"
                  BorderBrush="#d8d8d0" BorderThickness="1" Margin="0,0,6,6" MinWidth="104"/>
        </WrapPanel>

        <WrapPanel Orientation="Horizontal" ItemHeight="32">
          <Button x:Name="BtnSessionStart" Content="START SESSION"
                  Background="#006622" Foreground="#ffffff"
                  BorderBrush="#006622" Margin="0,0,6,0" MinWidth="116"/>
          <Button x:Name="BtnSessionEnd" Content="END SESSION"
                  Background="#ffffff" Foreground="#606060"
                  BorderBrush="#d8d8d0" IsEnabled="False" Margin="0,0,6,0" MinWidth="96"/>
          <Border x:Name="BtnSessionInfo"
                  Background="Transparent" BorderBrush="#6060a0" BorderThickness="1"
                  CornerRadius="2" Padding="5,2" Margin="2,0,0,0"
                  Cursor="Hand" ToolTip="Help: session mode">
            <TextBlock Text="?" FontFamily="Consolas" FontSize="12" FontWeight="Bold"
                       Foreground="#6060a0" VerticalAlignment="Center"/>
          </Border>
        </WrapPanel>
      </StackPanel>
    </Border>

    <!-- ===== ONGLETS ===== -->
    <TabControl Grid.Row="3" Panel.ZIndex="2" x:Name="TabCtrl"
                TabStripPlacement="Left"
                Background="#ffffff"
                BorderBrush="#e0e0d8" BorderThickness="0,0,1,0"/>

    <!-- ===== LOG ===== -->
    <Border x:Name="LogBorder" Grid.Row="4" Panel.ZIndex="2"
            Background="#ffffff"
            BorderBrush="#e0e0d8" BorderThickness="0,1,0,1">
      <Grid>
        <Grid.RowDefinitions>
          <RowDefinition Height="20"/>
          <RowDefinition Height="*"/>
        </Grid.RowDefinitions>
        <Border x:Name="LogHeaderBorder" Grid.Row="0" Background="#f4f4ef" Padding="16,0"
                BorderBrush="#e0e0d8" BorderThickness="0,0,0,1">
          <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
            <Rectangle x:Name="LogSep" Width="10" Height="1" Fill="#1E1EFF" VerticalAlignment="Center" Margin="0,0,8,0"/>
            <TextBlock x:Name="LogLabel" Text="LOG" FontFamily="Consolas" FontSize="9"
                       Foreground="#b0b0c0" VerticalAlignment="Center"/>
          </StackPanel>
        </Border>
        <ScrollViewer Grid.Row="1" x:Name="LogScroll"
                      VerticalScrollBarVisibility="Auto"
                      HorizontalScrollBarVisibility="Disabled">
          <TextBox x:Name="LogBox" IsReadOnly="True"
                   Background="Transparent" BorderThickness="0"
                   Foreground="#606070" FontFamily="Consolas" FontSize="11"
                   Padding="16,6" TextWrapping="Wrap"
                   Text="SYSTEM READY  //  Select optimizations, then click RUN."/>
        </ScrollViewer>
      </Grid>
    </Border>

    <!-- ===== FOOTER ===== -->
    <Border x:Name="FooterBorder" Grid.Row="5" Panel.ZIndex="2"
            Background="#ffffff" Padding="18,10"
            BorderBrush="#e0e0d8" BorderThickness="0,0,0,0">
      <Grid>
        <Grid.ColumnDefinitions>
          <ColumnDefinition Width="*"/>
          <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>
        <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
          <Rectangle x:Name="StatusSep" Width="10" Height="1" Fill="#1E1EFF" VerticalAlignment="Center" Margin="0,0,10,0"/>
          <TextBlock x:Name="StatusText" FontFamily="Consolas" FontSize="11"
                     Foreground="#b0b0c0" VerticalAlignment="Center"/>
        </StackPanel>
        <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Center">
          <Button x:Name="BtnMtu" Content="MTU"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,6,0"/>
          <Button x:Name="BtnPing" Content="PING"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,6,0"/>
          <Button x:Name="BtnHistory" Content="HISTORY"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,6,0"/>
          <Button x:Name="BtnExport" Content="EXPORT LOG"
                  Background="#ffffff" Foreground="#a0a0b0"
                  BorderBrush="#d8d8d0" Margin="0,0,6,0"/>
          <Button x:Name="BtnRun"
                  Content="  RUN OPTIMIZATIONS  "
                  Background="#1E1EFF" Foreground="#ffffff"
                  BorderBrush="#1E1EFF" BorderThickness="1"
                  FontWeight="Bold" FontSize="13" Padding="20,10"/>
        </StackPanel>
      </Grid>
    </Border>

  </Grid>
</Window>
'@

# ================================================================
#  CHARGEMENT FENETRE
# ================================================================

$reader           = [System.Xml.XmlNodeReader]::new($xaml)
$window           = [Windows.Markup.XamlReader]::Load($reader)
$script:LogBox    = $window.FindName("LogBox")
$script:LogScroll = $window.FindName("LogScroll")
$tabCtrl          = $window.FindName("TabCtrl")
$statusText       = $window.FindName("StatusText")
$btnRun           = $window.FindName("BtnRun")
$btnAll           = $window.FindName("BtnAll")
$btnSafe          = $window.FindName("BtnSafe")
$btnNone          = $window.FindName("BtnNone")
$btnTheme         = $window.FindName("BtnTheme")
$btnTournoi       = $window.FindName("BtnTournoi")
$btnStream        = $window.FindName("BtnStream")
$btnMaxPerf       = $window.FindName("BtnMaxPerf")
$btnPing          = $window.FindName("BtnPing")
$btnMtu           = $window.FindName("BtnMtu")
$btnHistory       = $window.FindName("BtnHistory")
$btnExport        = $window.FindName("BtnExport")
$btnSaveProfil    = $window.FindName("BtnSaveProfil")
$btnLoadProfil    = $window.FindName("BtnLoadProfil")
$btnSessionStart  = $window.FindName("BtnSessionStart")
$btnSessionEnd    = $window.FindName("BtnSessionEnd")
$sysInfoTb        = $window.FindName("SysInfoTb")
$scoreTb          = $window.FindName("ScoreTb")
$bgRect           = $window.FindName("BgRect")
$symCanvas        = $window.FindName("SymbolCanvas")

# ================================================================
#  CONSTRUCTION DES ONGLETS
# ================================================================

$script:checkboxes   = @{}
$script:cardBorders  = @{}
$script:keyTbs       = @{}
$script:labelTbs     = @{}
$script:descTbs      = @{}
$script:descHeadTbs  = @{}
$script:descBodyTbs  = @{}
$script:diagTbs      = @{}
$script:runTbs       = @{}
$script:tabIconTbs   = [System.Collections.Generic.List[object]]::new()
$script:tabNameTbs   = [System.Collections.Generic.List[object]]::new()
$script:tabAdvFlags  = [System.Collections.Generic.List[bool]]::new()
$script:currentTheme   = "Light"
$script:currentLang    = "FR"
$script:str            = $null
$script:sessionActive  = $false
$script:activePreset   = $null
$conv = [Windows.Media.BrushConverter]::new()

$colorFg  = @{ 0="#1E1EFF"; 1="#cc6600"; 2="#cc0000" }
$colorKey = "#1E1EFF"
$badgeMap = @{ 0=""; 1="  [!]"; 2="  [!!]" }

function Update-Status {
    $sel = ($script:checkboxes.Values | Where-Object { $_.IsChecked -eq $true }).Count
    $tot = $script:checkboxes.Count
    $fmt = if ($script:str -and $script:str.StatusFmt) { $script:str.StatusFmt } else { "{0} / {1} OPTIMISATIONS SELECTIONNEES" }
    $base = $fmt -f $sel, $tot
    $statusText.Text = if ($script:activePreset) { "PRESET $($script:activePreset)  //  $base" } else { $base }
}

foreach ($g in $script:groups) {

    $tab = [Windows.Controls.TabItem]::new()
    $tab.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
    $tab.FontSize   = 10
    $tab.Padding    = [Windows.Thickness]::new(10, 5, 10, 5)

    # Header onglet : "SYS  Systeme"
    $hSP = [Windows.Controls.StackPanel]::new()
    $hSP.Orientation = [Windows.Controls.Orientation]::Vertical

    $iconTb           = [Windows.Controls.TextBlock]::new()
    $iconTb.Text      = $g.Icon
    $iconTb.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
    $iconTb.FontSize  = 8
    $iconTb.FontWeight = [Windows.FontWeights]::Bold
    $iconTb.Foreground = if ($g.IsAdv) { $conv.ConvertFromString("#cc0000") } else { $conv.ConvertFromString("#1E1EFF") }
    $iconTb.HorizontalAlignment = [Windows.HorizontalAlignment]::Left

    $nameTb           = [Windows.Controls.TextBlock]::new()
    $nameTb.Text      = $g.Name.ToUpper()
    $nameTb.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
    $nameTb.FontSize  = 9
    $nameTb.Foreground = if ($g.IsAdv) { $conv.ConvertFromString("#cc0000") } else { $conv.ConvertFromString("#a0a0b0") }
    $nameTb.HorizontalAlignment = [Windows.HorizontalAlignment]::Left
    $nameTb.Margin    = [Windows.Thickness]::new(0, 0, 0, 0)

    $hSP.Children.Add($iconTb) | Out-Null
    $hSP.Children.Add($nameTb) | Out-Null
    $tab.Header = $hSP
    $script:tabIconTbs.Add($iconTb)         | Out-Null
    $script:tabNameTbs.Add($nameTb)         | Out-Null
    $script:tabAdvFlags.Add([bool]$g.IsAdv) | Out-Null

    # Contenu
    $scroll = [Windows.Controls.ScrollViewer]::new()
    $scroll.VerticalScrollBarVisibility   = "Auto"
    $scroll.HorizontalScrollBarVisibility = "Disabled"
    $scroll.Background = [Windows.Media.Brushes]::Transparent

    $wrap             = [Windows.Controls.WrapPanel]::new()
    $wrap.Margin      = [Windows.Thickness]::new(20, 18, 20, 18)
    $wrap.Orientation = [Windows.Controls.Orientation]::Horizontal

    foreach ($opt in $g.Opts) {

        $fg     = $colorFg[$opt.Level]
        $badge  = $badgeMap[$opt.Level]
        $note   = if ($opt.PSObject.Properties.Name -contains "Note" -and $opt.Note) { "  [$($opt.Note)]" } else { "" }

        # Carte
        $card = [Windows.Controls.Border]::new()
        $card.Width        = 420
        $card.Margin       = [Windows.Thickness]::new(0, 0, 12, 10)
        $card.Padding      = [Windows.Thickness]::new(14, 10, 14, 10)
        $card.CornerRadius = [Windows.CornerRadius]::new(2)
        $card.BorderThickness = [Windows.Thickness]::new(1, 1, 1, 1)

        if ($opt.Level -eq 2) {
            $card.Background  = $conv.ConvertFromString("#ffffff")
            $card.BorderBrush = $conv.ConvertFromString("#f0cccc")
        } elseif ($opt.Level -eq 1) {
            $card.Background  = $conv.ConvertFromString("#ffffff")
            $card.BorderBrush = $conv.ConvertFromString("#f0dfc0")
        } else {
            $card.Background  = $conv.ConvertFromString("#ffffff")
            $card.BorderBrush = $conv.ConvertFromString("#e0e0d8")
        }

        $cb = [Windows.Controls.CheckBox]::new()
        $cb.IsChecked   = [bool]$opt.Sel
        $cb.FontFamily  = [Windows.Media.FontFamily]::new("Consolas")
        $cb.FontSize    = 12
        $cb.Cursor      = [Windows.Input.Cursors]::Hand
        $cb.VerticalContentAlignment = [Windows.VerticalAlignment]::Center

        $cSP            = [Windows.Controls.StackPanel]::new()
        $cSP.Orientation = [Windows.Controls.Orientation]::Horizontal

        $keyTb            = [Windows.Controls.TextBlock]::new()
        $keyTb.Text       = "[$($opt.Key)]  "
        $keyTb.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
        $keyTb.FontSize   = 11
        $keyTb.FontWeight = [Windows.FontWeights]::Bold
        $keyTb.Foreground = $conv.ConvertFromString($colorKey)
        $keyTb.VerticalAlignment = [Windows.VerticalAlignment]::Center

        $lbTb             = [Windows.Controls.TextBlock]::new()
        $lbTb.Text        = "$($opt.Short)$badge$note"
        $lbTb.FontFamily  = [Windows.Media.FontFamily]::new("Consolas")
        $lbTb.FontSize    = 12
        $lbTb.Foreground  = $conv.ConvertFromString($fg)
        $lbTb.VerticalAlignment = [Windows.VerticalAlignment]::Center
        $lbTb.TextWrapping = [Windows.TextWrapping]::Wrap

        $cSP.Children.Add($keyTb) | Out-Null
        $cSP.Children.Add($lbTb)  | Out-Null
        $cb.Content = $cSP

        # Tooltip disclaimer (rouge tactical)
        if ($opt.PSObject.Properties.Name -contains "Disclaimer" -and $opt.Disclaimer) {
            $tt = [Windows.Controls.ToolTip]::new()
            $tt.Background      = $conv.ConvertFromString("#fff8f8")
            $tt.BorderBrush     = $conv.ConvertFromString("#cc0000")
            $tt.BorderThickness = [Windows.Thickness]::new(1)
            $tt.Padding         = [Windows.Thickness]::new(14, 10, 14, 10)

            $ttSP = [Windows.Controls.StackPanel]::new()

            $ttHead           = [Windows.Controls.TextBlock]::new()
            $ttHead.Text      = "! AVERTISSEMENT"
            $ttHead.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
            $ttHead.FontSize  = 10
            $ttHead.FontWeight = [Windows.FontWeights]::Bold
            $ttHead.Foreground = $conv.ConvertFromString("#cc0000")
            $ttHead.Margin    = [Windows.Thickness]::new(0, 0, 0, 6)

            $ttBody           = [Windows.Controls.TextBlock]::new()
            $ttBody.Text      = $opt.Disclaimer
            $ttBody.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
            $ttBody.FontSize  = 11
            $ttBody.Foreground = $conv.ConvertFromString("#804040")
            $ttBody.MaxWidth  = 360
            $ttBody.TextWrapping = [Windows.TextWrapping]::Wrap

            $ttSP.Children.Add($ttHead) | Out-Null
            $ttSP.Children.Add($ttBody) | Out-Null
            $tt.Content = $ttSP
            $cb.ToolTip = $tt
        }

        $cb.Add_Checked({   Update-Status })
        $cb.Add_Unchecked({ Update-Status })

        $key = $opt.Key
        $script:checkboxes[$key]  = $cb
        $script:cardBorders[$key] = $card
        $script:keyTbs[$key]      = $keyTb
        $script:labelTbs[$key]    = $lbTb

        # Grille: CheckBox (gauche) + bouton (?) (droite)
        $helpGrid = [Windows.Controls.Grid]::new()
        $hc1 = [Windows.Controls.ColumnDefinition]::new()
        $hc1.Width = [Windows.GridLength]::new(1, [Windows.GridUnitType]::Star)
        $hc2 = [Windows.Controls.ColumnDefinition]::new()
        $hc2.Width = [Windows.GridLength]::Auto
        $helpGrid.ColumnDefinitions.Add($hc1) | Out-Null
        $helpGrid.ColumnDefinitions.Add($hc2) | Out-Null
        [Windows.Controls.Grid]::SetColumn($cb, 0)
        $helpGrid.Children.Add($cb) | Out-Null

        $helpTb = [Windows.Controls.TextBlock]::new()
        $helpTb.Text            = " (?)"
        $helpTb.FontFamily      = [Windows.Media.FontFamily]::new("Consolas")
        $helpTb.FontSize        = 10
        $helpTb.Foreground      = $conv.ConvertFromString("#8888aa")
        $helpTb.Cursor          = [Windows.Input.Cursors]::Help
        $helpTb.VerticalAlignment = [Windows.VerticalAlignment]::Center

        $htip = [Windows.Controls.ToolTip]::new()
        $htip.Background      = $conv.ConvertFromString("#0a1020")
        $htip.BorderBrush     = $conv.ConvertFromString("#1E1EFF")
        $htip.BorderThickness = [Windows.Thickness]::new(1)
        $htip.Padding         = [Windows.Thickness]::new(14, 10, 14, 10)
        $htipSP = [Windows.Controls.StackPanel]::new()

        $htipHead = [Windows.Controls.TextBlock]::new()
        $htipHead.FontFamily  = [Windows.Media.FontFamily]::new("Consolas")
        $htipHead.FontSize    = 10
        $htipHead.FontWeight  = [Windows.FontWeights]::Bold
        $htipHead.Foreground  = $conv.ConvertFromString("#4a6aff")
        $htipHead.Text        = $opt.Short
        $htipHead.Margin      = [Windows.Thickness]::new(0, 0, 0, 6)

        $htipBody = [Windows.Controls.TextBlock]::new()
        $htipBody.FontFamily  = [Windows.Media.FontFamily]::new("Consolas")
        $htipBody.FontSize    = 11
        $htipBody.Foreground  = $conv.ConvertFromString("#a0b8d0")
        $htipBody.MaxWidth    = 380
        $htipBody.TextWrapping = [Windows.TextWrapping]::Wrap
        $htipBody.Text        = if ($script:optDesc.ContainsKey($key)) { $script:optDesc[$key]["FR"] } else { "" }

        $htipSP.Children.Add($htipHead) | Out-Null
        $htipSP.Children.Add($htipBody) | Out-Null
        $htip.Content   = $htipSP
        $helpTb.ToolTip = $htip

        [Windows.Controls.Grid]::SetColumn($helpTb, 1)
        $helpGrid.Children.Add($helpTb) | Out-Null

        $script:descTbs[$key]     = $helpTb
        $script:descHeadTbs[$key] = $htipHead
        $script:descBodyTbs[$key] = $htipBody

        # Ligne statut : diag (gauche) + post-run (droite)
        $statusRow = [Windows.Controls.Grid]::new()
        $sr1 = [Windows.Controls.ColumnDefinition]::new(); $sr1.Width = [Windows.GridLength]::new(1,[Windows.GridUnitType]::Star)
        $sr2 = [Windows.Controls.ColumnDefinition]::new(); $sr2.Width = [Windows.GridLength]::Auto
        $statusRow.ColumnDefinitions.Add($sr1) | Out-Null
        $statusRow.ColumnDefinitions.Add($sr2) | Out-Null
        $statusRow.Margin = [Windows.Thickness]::new(0,4,0,0)

        $diagTb = [Windows.Controls.TextBlock]::new()
        $diagTb.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
        $diagTb.FontSize   = 9
        $diagTb.Foreground = $conv.ConvertFromString("#a0a0b0")
        $diagTb.Text       = ""
        [Windows.Controls.Grid]::SetColumn($diagTb, 0)
        $statusRow.Children.Add($diagTb) | Out-Null

        $runTb = [Windows.Controls.TextBlock]::new()
        $runTb.FontFamily = [Windows.Media.FontFamily]::new("Consolas")
        $runTb.FontSize   = 9
        $runTb.Foreground = $conv.ConvertFromString("#a0a0b0")
        $runTb.Text       = ""
        $runTb.HorizontalAlignment = [Windows.HorizontalAlignment]::Right
        [Windows.Controls.Grid]::SetColumn($runTb, 1)
        $statusRow.Children.Add($runTb) | Out-Null

        $script:diagTbs[$key] = $diagTb
        $script:runTbs[$key]  = $runTb

        $cardSP = [Windows.Controls.StackPanel]::new()
        $cardSP.Children.Add($helpGrid)   | Out-Null
        $cardSP.Children.Add($statusRow)  | Out-Null
        $card.Child = $cardSP
        $wrap.Children.Add($card) | Out-Null
    }

    $scroll.Content = $wrap
    $tab.Content    = $scroll
    $tabCtrl.Items.Add($tab) | Out-Null
}

Update-Status

# ================================================================
#  THEMES + SWITCH
# ================================================================

$script:themes = @{
    Light = @{
        # Fonds
        BgWindow="#f4f4ef"; BgPanel="#ffffff"; BgSub="#f4f4ef"
        # Onglets (DynamicResource)
        TabBgInact="#f4f4ef"; TabBgAct="#ffffff"; TabBgHov="#eaeaf5"
        TabFgInact="#b0b0c0"; TabFgAct="#1E1EFF"; TabFgHov="#4040cc"
        # Grid arriere-plan
        GridBase="#f4f4ef"; GridLine="#e2e2da"; SymOpacity=0.07
        # Bordures
        BrBorder="#e0e0d8"
        # Textes
        SubtitleFg="#b0b0c0"; StatusFg="#b0b0c0"; SelectFg="#c8c8c8"
        LogFg="#606070"; LogHeaderBg="#f4f4ef"
        # Boutons toolbar
        BtnAllBg="#1E1EFF"; BtnAllFg="#ffffff"; BtnAllBr="#1E1EFF"
        BtnSafeBg="#ffffff"; BtnSafeFg="#1E1EFF"; BtnSafeBr="#1E1EFF"
        BtnNoneBg="#ffffff"; BtnNoneFg="#a0a0b0"; BtnNoneBr="#d8d8d0"
        BtnThemeBg="#f4f4ef"; BtnThemeFg="#b0b0c0"; BtnThemeBr="#d8d8d0"
        BtnThemeText="  MODE SOMBRE  "
        BtnRunBg="#1E1EFF"; BtnRunFg="#ffffff"
        BtnTournoiBg="#0044cc"; BtnTournoiFg="#ffffff"; BtnTournoiBr="#0044cc"
        BtnStreamBg="#ffffff"; BtnStreamFg="#cc6600"; BtnStreamBr="#cc6600"
        BtnMaxPerfBg="#cc0000"; BtnMaxPerfFg="#ffffff"; BtnMaxPerfBr="#cc0000"
        BtnPingBg="#ffffff"; BtnPingFg="#a0a0b0"; BtnPingBr="#d8d8d0"
        BtnMtuBg="#ffffff"; BtnMtuFg="#a0a0b0"; BtnMtuBr="#d8d8d0"
        BtnHistoryBg="#ffffff"; BtnHistoryFg="#a0a0b0"; BtnHistoryBr="#d8d8d0"
        BtnExportBg="#ffffff"; BtnExportFg="#a0a0b0"; BtnExportBr="#d8d8d0"
        BtnSaveProfilBg="#ffffff"; BtnSaveProfilFg="#a0a0b0"; BtnSaveProfilBr="#d8d8d0"
        BtnLoadProfilBg="#ffffff"; BtnLoadProfilFg="#a0a0b0"; BtnLoadProfilBr="#d8d8d0"
        BtnSessionStartBg="#006622"; BtnSessionStartFg="#ffffff"; BtnSessionStartBr="#006622"
        BtnSessionEndBg="#ffffff"; BtnSessionEndFg="#606060"; BtnSessionEndBr="#d8d8d0"
        ScoreFg="#1E1EFF"
        SysInfoFg="#a0a0b0"
        # Legende
        LegendBg="#f8f8f3"
        # Cartes
        CardBg0="#ffffff"; CardBr0="#e0e0d8"
        CardBg1="#ffffff"; CardBr1="#f0dfc0"
        CardBg2="#ffffff"; CardBr2="#f0cccc"
        # Couleurs option
        FgSafe="#1E1EFF"; FgWarn="#cc6600"; FgDanger="#cc0000"; FgKey="#1E1EFF"
        # Onglet headers
        IconNorm="#1E1EFF"; NameNorm="#a0a0b0"; IconAdv="#cc0000"; NameAdv="#cc0000"
        # Tooltip
        TtBg="#fff8f8"; TtBr="#cc0000"
        # Separateurs
        AccentLine="#1E1EFF"
    }
    Dark = @{
        BgWindow="#090d18"; BgPanel="#0d1526"; BgSub="#080c16"
        TabBgInact="#080c16"; TabBgAct="#0d1526"; TabBgHov="#0a1220"
        TabFgInact="#3a5570"; TabFgAct="#4a6aff"; TabFgHov="#6a8aee"
        GridBase="#090d18"; GridLine="#141e30"; SymOpacity=0.09
        BrBorder="#1a2a40"
        SubtitleFg="#3a5570"; StatusFg="#3a5570"; SelectFg="#1e3a55"
        LogFg="#4a6880"; LogHeaderBg="#080c16"
        BtnAllBg="#1E1EFF"; BtnAllFg="#ffffff"; BtnAllBr="#1E1EFF"
        BtnSafeBg="#0d1526"; BtnSafeFg="#4a6aff"; BtnSafeBr="#1E1EFF"
        BtnNoneBg="#0d1526"; BtnNoneFg="#3a5570"; BtnNoneBr="#1a2a40"
        BtnThemeBg="#0d1526"; BtnThemeFg="#4a6aff"; BtnThemeBr="#1a2a40"
        BtnThemeText="  MODE CLAIR  "
        BtnRunBg="#1E1EFF"; BtnRunFg="#ffffff"
        BtnTournoiBg="#0044cc"; BtnTournoiFg="#ffffff"; BtnTournoiBr="#0044cc"
        BtnStreamBg="#141810"; BtnStreamFg="#cc8800"; BtnStreamBr="#cc8800"
        BtnMaxPerfBg="#cc0000"; BtnMaxPerfFg="#ffffff"; BtnMaxPerfBr="#cc0000"
        BtnPingBg="#0d1526"; BtnPingFg="#3a5570"; BtnPingBr="#1a2a40"
        BtnMtuBg="#0d1526"; BtnMtuFg="#3a5570"; BtnMtuBr="#1a2a40"
        BtnHistoryBg="#0d1526"; BtnHistoryFg="#3a5570"; BtnHistoryBr="#1a2a40"
        BtnExportBg="#0d1526"; BtnExportFg="#3a5570"; BtnExportBr="#1a2a40"
        BtnSaveProfilBg="#0d1526"; BtnSaveProfilFg="#3a5570"; BtnSaveProfilBr="#1a2a40"
        BtnLoadProfilBg="#0d1526"; BtnLoadProfilFg="#3a5570"; BtnLoadProfilBr="#1a2a40"
        BtnSessionStartBg="#004418"; BtnSessionStartFg="#00cc44"; BtnSessionStartBr="#006622"
        BtnSessionEndBg="#0d1526"; BtnSessionEndFg="#3a5570"; BtnSessionEndBr="#1a2a40"
        ScoreFg="#4a6aff"
        SysInfoFg="#3a5570"
        LegendBg="#0d1526"
        CardBg0="#111e34"; CardBr0="#1a2a40"
        CardBg1="#141810"; CardBr1="#2a2010"
        CardBg2="#180e0e"; CardBr2="#2a0d0d"
        FgSafe="#4a6aff"; FgWarn="#cc8800"; FgDanger="#dd2222"; FgKey="#4a6aff"
        IconNorm="#4a6aff"; NameNorm="#3a5570"; IconAdv="#dd2222"; NameAdv="#dd2222"
        TtBg="#0f0505"; TtBr="#dd2222"
        AccentLine="#1E1EFF"
    }
}

function New-GridBrush {
    param([string]$base, [string]$line)
    $b   = [Windows.Media.DrawingBrush]::new()
    $b.TileMode        = [Windows.Media.TileMode]::Tile
    $b.Viewport        = [Windows.Rect]::new(0,0,40,40)
    $b.ViewportUnits   = [Windows.Media.BrushMappingMode]::Absolute
    $b.Viewbox         = [Windows.Rect]::new(0,0,40,40)
    $b.ViewboxUnits    = [Windows.Media.BrushMappingMode]::Absolute
    $grp = [Windows.Media.DrawingGroup]::new()
    $bg  = [Windows.Media.GeometryDrawing]::new()
    $bg.Brush    = $conv.ConvertFromString($base)
    $bg.Geometry = [Windows.Media.RectangleGeometry]::new([Windows.Rect]::new(0,0,40,40))
    $grp.Children.Add($bg) | Out-Null
    $gd  = [Windows.Media.GeometryDrawing]::new()
    $gd.Pen      = [Windows.Media.Pen]::new($conv.ConvertFromString($line), 0.5)
    $gd.Geometry = [Windows.Media.RectangleGeometry]::new([Windows.Rect]::new(0,0,40,40))
    $grp.Children.Add($gd) | Out-Null
    $b.Drawing = $grp
    return $b
}

function Switch-Theme {
    param([string]$mode)
    $t = $script:themes[$mode]

    # Onglets (DynamicResource)
    $window.Resources["TabBgInact"] = $conv.ConvertFromString($t.TabBgInact)
    $window.Resources["TabBgAct"]   = $conv.ConvertFromString($t.TabBgAct)
    $window.Resources["TabBgHov"]   = $conv.ConvertFromString($t.TabBgHov)
    $window.Resources["TabFgInact"] = $conv.ConvertFromString($t.TabFgInact)
    $window.Resources["TabFgAct"]   = $conv.ConvertFromString($t.TabFgAct)
    $window.Resources["TabFgHov"]   = $conv.ConvertFromString($t.TabFgHov)

    # Grille arriere-plan
    $bgRect.Fill        = New-GridBrush $t.GridBase $t.GridLine
    $symCanvas.Opacity  = $t.SymOpacity
    foreach ($child in $symCanvas.Children) {
        $child.Foreground = $conv.ConvertFromString($t.AccentLine)
    }

    # Fonds principaux
    $window.FindName("HeaderBorder").Background    = $conv.ConvertFromString($t.BgPanel)
    $window.FindName("HeaderBorder").BorderBrush   = $conv.ConvertFromString($t.BrBorder)
    $window.FindName("LegendBorder").Background    = $conv.ConvertFromString($t.LegendBg)
    $window.FindName("LegendBorder").BorderBrush   = $conv.ConvertFromString($t.BrBorder)
    $window.FindName("ToolbarBorder").Background   = $conv.ConvertFromString($t.BgPanel)
    $window.FindName("ToolbarBorder").BorderBrush  = $conv.ConvertFromString($t.BrBorder)
    $window.FindName("LogBorder").Background       = $conv.ConvertFromString($t.BgPanel)
    $window.FindName("LogBorder").BorderBrush      = $conv.ConvertFromString($t.BrBorder)
    $window.FindName("LogHeaderBorder").Background = $conv.ConvertFromString($t.LogHeaderBg)
    $window.FindName("LogHeaderBorder").BorderBrush= $conv.ConvertFromString($t.BrBorder)
    $window.FindName("FooterBorder").Background    = $conv.ConvertFromString($t.BgPanel)
    $tabCtrl.Background = $conv.ConvertFromString($t.BgPanel)
    $tabCtrl.BorderBrush = $conv.ConvertFromString($t.BrBorder)

    # Textes statiques
    $window.FindName("SubtitleTb").Foreground  = $conv.ConvertFromString($t.SubtitleFg)
    $window.FindName("SubSep1").Fill           = $conv.ConvertFromString($t.AccentLine)
    $window.FindName("SubSep2").Fill           = $conv.ConvertFromString($t.AccentLine)
    $window.FindName("LogLabel").Foreground    = $conv.ConvertFromString($t.SubtitleFg)
    $window.FindName("LogSep").Fill            = $conv.ConvertFromString($t.AccentLine)
    $window.FindName("StatusSep").Fill         = $conv.ConvertFromString($t.AccentLine)
    $window.FindName("SelectionLabel").Foreground = $conv.ConvertFromString($t.SelectFg)
    $statusText.Foreground                    = $conv.ConvertFromString($t.StatusFg)
    $script:LogBox.Foreground                 = $conv.ConvertFromString($t.LogFg)

    # Runs de la legende ([#] SAFE  [!] COMPORTEMENT  [!!] INTEGRITE)
    $runs = @($window.FindName("LegendTb").Inlines)
    if ($runs.Count -ge 6) {
        $runs[0].Foreground = $conv.ConvertFromString($t.FgSafe)
        $runs[1].Foreground = $conv.ConvertFromString($t.SubtitleFg)
        $runs[2].Foreground = $conv.ConvertFromString($t.FgWarn)
        $runs[3].Foreground = $conv.ConvertFromString($t.SubtitleFg)
        $runs[4].Foreground = $conv.ConvertFromString($t.FgDanger)
        $runs[5].Foreground = $conv.ConvertFromString($t.SubtitleFg)
    }

    # Boutons toolbar
    $btnAll.Background  = $conv.ConvertFromString($t.BtnAllBg)
    $btnAll.Foreground  = $conv.ConvertFromString($t.BtnAllFg)
    $btnAll.BorderBrush = $conv.ConvertFromString($t.BtnAllBr)
    $btnSafe.Background  = $conv.ConvertFromString($t.BtnSafeBg)
    $btnSafe.Foreground  = $conv.ConvertFromString($t.BtnSafeFg)
    $btnSafe.BorderBrush = $conv.ConvertFromString($t.BtnSafeBr)
    $btnNone.Background  = $conv.ConvertFromString($t.BtnNoneBg)
    $btnNone.Foreground  = $conv.ConvertFromString($t.BtnNoneFg)
    $btnNone.BorderBrush = $conv.ConvertFromString($t.BtnNoneBr)
    $btnTheme.Background  = $conv.ConvertFromString($t.BtnThemeBg)
    $btnTheme.Foreground  = $conv.ConvertFromString($t.BtnThemeFg)
    $btnTheme.BorderBrush = $conv.ConvertFromString($t.BtnThemeBr)
    $btnTheme.Content = if ($script:str) {
        if ($mode -eq "Light") { $script:str.BtnDark } else { $script:str.BtnLight }
    } else { $t.BtnThemeText }
    $btnRun.Background  = $conv.ConvertFromString($t.BtnRunBg)
    $btnRun.Foreground  = $conv.ConvertFromString($t.BtnRunFg)
    $btnTournoi.Background  = $conv.ConvertFromString($t.BtnTournoiBg)
    $btnTournoi.Foreground  = $conv.ConvertFromString($t.BtnTournoiFg)
    $btnTournoi.BorderBrush = $conv.ConvertFromString($t.BtnTournoiBr)
    $btnStream.Background   = $conv.ConvertFromString($t.BtnStreamBg)
    $btnStream.Foreground   = $conv.ConvertFromString($t.BtnStreamFg)
    $btnStream.BorderBrush  = $conv.ConvertFromString($t.BtnStreamBr)
    $btnMaxPerf.Background  = $conv.ConvertFromString($t.BtnMaxPerfBg)
    $btnMaxPerf.Foreground  = $conv.ConvertFromString($t.BtnMaxPerfFg)
    $btnMaxPerf.BorderBrush = $conv.ConvertFromString($t.BtnMaxPerfBr)
    $btnPing.Background   = $conv.ConvertFromString($t.BtnPingBg)
    $btnPing.Foreground   = $conv.ConvertFromString($t.BtnPingFg)
    $btnPing.BorderBrush  = $conv.ConvertFromString($t.BtnPingBr)
    $btnMtu.Background    = $conv.ConvertFromString($t.BtnMtuBg)
    $btnMtu.Foreground    = $conv.ConvertFromString($t.BtnMtuFg)
    $btnMtu.BorderBrush   = $conv.ConvertFromString($t.BtnMtuBr)
    $btnHistory.Background   = $conv.ConvertFromString($t.BtnHistoryBg)
    $btnHistory.Foreground   = $conv.ConvertFromString($t.BtnHistoryFg)
    $btnHistory.BorderBrush  = $conv.ConvertFromString($t.BtnHistoryBr)
    $btnExport.Background  = $conv.ConvertFromString($t.BtnExportBg)
    $btnExport.Foreground  = $conv.ConvertFromString($t.BtnExportFg)
    $btnExport.BorderBrush = $conv.ConvertFromString($t.BtnExportBr)
    $btnSaveProfil.Background  = $conv.ConvertFromString($t.BtnSaveProfilBg)
    $btnSaveProfil.Foreground  = $conv.ConvertFromString($t.BtnSaveProfilFg)
    $btnSaveProfil.BorderBrush = $conv.ConvertFromString($t.BtnSaveProfilBr)
    $btnLoadProfil.Background  = $conv.ConvertFromString($t.BtnLoadProfilBg)
    $btnLoadProfil.Foreground  = $conv.ConvertFromString($t.BtnLoadProfilFg)
    $btnLoadProfil.BorderBrush = $conv.ConvertFromString($t.BtnLoadProfilBr)
    $btnSessionStart.Background  = $conv.ConvertFromString($t.BtnSessionStartBg)
    $btnSessionStart.Foreground  = $conv.ConvertFromString($t.BtnSessionStartFg)
    $btnSessionStart.BorderBrush = $conv.ConvertFromString($t.BtnSessionStartBr)
    $btnSessionEnd.Background  = $conv.ConvertFromString($t.BtnSessionEndBg)
    $btnSessionEnd.Foreground  = $conv.ConvertFromString($t.BtnSessionEndFg)
    $btnSessionEnd.BorderBrush = $conv.ConvertFromString($t.BtnSessionEndBr)
    $sysInfoTb.Foreground  = $conv.ConvertFromString($t.SysInfoFg)
    $scoreTb.Foreground    = $conv.ConvertFromString($t.ScoreFg)

    # En-têtes d'onglets
    for ($i = 0; $i -lt $script:tabIconTbs.Count; $i++) {
        $adv = $script:tabAdvFlags[$i]
        $script:tabIconTbs[$i].Foreground = $conv.ConvertFromString($(if ($adv) { $t.IconAdv } else { $t.IconNorm }))
        $script:tabNameTbs[$i].Foreground = $conv.ConvertFromString($(if ($adv) { $t.NameAdv } else { $t.NameNorm }))
    }

    # Cartes et textes options
    foreach ($k in $script:cardBorders.Keys) {
        $opt  = $script:allOpts[$k]
        $card = $script:cardBorders[$k]
        $kTb  = $script:keyTbs[$k]
        $lTb  = $script:labelTbs[$k]
        if ($opt.Level -eq 2) {
            $card.Background  = $conv.ConvertFromString($t.CardBg2)
            $card.BorderBrush = $conv.ConvertFromString($t.CardBr2)
            $lTb.Foreground   = $conv.ConvertFromString($t.FgDanger)
        } elseif ($opt.Level -eq 1) {
            $card.Background  = $conv.ConvertFromString($t.CardBg1)
            $card.BorderBrush = $conv.ConvertFromString($t.CardBr1)
            $lTb.Foreground   = $conv.ConvertFromString($t.FgWarn)
        } else {
            $card.Background  = $conv.ConvertFromString($t.CardBg0)
            $card.BorderBrush = $conv.ConvertFromString($t.CardBr0)
            $lTb.Foreground   = $conv.ConvertFromString($t.FgSafe)
        }
        $kTb.Foreground = $conv.ConvertFromString($t.FgKey)
    }

    $script:currentTheme = $mode
}

# ================================================================
#  LANGUE
# ================================================================

function Apply-Language {
    param([string]$lang)
    $script:currentLang = $lang
    $script:str = $script:strings[$lang]
    $s = $script:str

    $window.Title = $s.WinTitle
    $window.FindName("SubtitleTb").Text     = $s.Subtitle
    $window.FindName("SelectionLabel").Text = $s.SelLabel
    $window.FindName("LegendHintTb").Text   = $s.LegHint
    $btnAll.Content  = $s.BtnAll
    $btnSafe.Content = $s.BtnSafe
    $btnNone.Content = $s.BtnNone
    $btnRun.Content  = $s.BtnRun
    $btnTheme.Content = if ($script:currentTheme -eq "Light") { $s.BtnDark } else { $s.BtnLight }
    $script:LogBox.Text = $s.LogReady

    # Runs de la legende
    $runs = @($window.FindName("LegendTb").Inlines)
    if ($runs.Count -ge 6) {
        $runs[1].Text = $s.LegSafe + "    "
        $runs[3].Text = $s.LegBehav + "    "
        $runs[5].Text = $s.LegInteg
    }

    # Noms des onglets
    for ($i = 0; $i -lt $script:groups.Count; $i++) {
        $gName = $script:groups[$i].Name
        if ($script:groupLangNames.ContainsKey($gName) -and $script:groupLangNames[$gName].ContainsKey($lang)) {
            $script:tabNameTbs[$i].Text = $script:groupLangNames[$gName][$lang].ToUpper()
        }
    }

    # Labels des options
    foreach ($k in $script:labelTbs.Keys) {
        $opt = $script:allOpts[$k]
        if ($script:optShortLang.ContainsKey($k) -and $script:optShortLang[$k].ContainsKey($lang)) {
            $badge = @{ 0=""; 1="  [!]"; 2="  [!!]" }[$opt.Level]
            $note  = if ($opt.PSObject.Properties.Name -contains "Note" -and $opt.Note) { "  [$($opt.Note)]" } else { "" }
            $script:labelTbs[$k].Text = "$($script:optShortLang[$k][$lang])$badge$note"
        }
    }

    # Tooltips (?) : titre + description
    foreach ($k in $script:descHeadTbs.Keys) {
        if ($script:optShortLang.ContainsKey($k) -and $script:optShortLang[$k].ContainsKey($lang)) {
            $script:descHeadTbs[$k].Text = $script:optShortLang[$k][$lang]
        }
        if ($script:optDesc.ContainsKey($k) -and $script:optDesc[$k].ContainsKey($lang)) {
            $script:descBodyTbs[$k].Text = $script:optDesc[$k][$lang]
        }
    }

    $btnTournoi.Content      = $s.BtnTournoi
    $btnStream.Content       = $s.BtnStream
    $btnMaxPerf.Content      = $s.BtnMaxPerf
    $btnPing.Content         = $s.BtnPing
    $btnMtu.Content          = $s.BtnMtu
    $btnHistory.Content      = $s.BtnHistory
    $btnExport.Content       = $s.BtnExport
    $btnSaveProfil.Content   = $s.BtnSaveProfil
    $btnLoadProfil.Content   = $s.BtnLoadProfil
    $btnSessionStart.Content = $s.BtnSessionStart
    $btnSessionEnd.Content   = $s.BtnSessionEnd

    Update-Status
}

function Update-PerfScore {
    $active = 0; $total = 0
    foreach ($k in $script:diagFns.Keys) {
        if ($k -like "RC*") { continue }
        $total++
        if ($script:diagTbs.ContainsKey($k) -and $script:str -and $script:diagTbs[$k].Text -eq $script:str.DiagActive) { $active++ }
    }
    $pct = if ($total -gt 0) { [Math]::Round($active / $total * 100) } else { 0 }
    $scoreTb.Text = if ($script:str -and $script:str.ScoreFmt) { $script:str.ScoreFmt -f $active, $total, $pct } else { "SCORE $active/$total ($pct%)" }
}

function Check-PendingReboot {
    $pending = $false
    if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") { $pending = $true }
    $pfo = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name "PendingFileRenameOperations" -EA SilentlyContinue).PendingFileRenameOperations
    if ($pfo) { $pending = $true }
    if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending") { $pending = $true }
    if ($pending) {
        $msg = if ($script:str -and $script:str.PendingReboot) { $script:str.PendingReboot } else { "Reboot pending." }
        [Windows.MessageBox]::Show($msg, "WZ PRO  //  REBOOT", "OK", "Warning") | Out-Null
    }
}

function Save-WzProfile {
    $dir = "$env:USERPROFILE\.wzpro"
    if (-not (Test-Path $dir)) { New-Item $dir -ItemType Directory -Force | Out-Null }
    $prof = @{}
    foreach ($k in $script:checkboxes.Keys) { $prof[$k] = [bool]$script:checkboxes[$k].IsChecked }
    $stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $path  = "$dir\profile-$stamp.json"
    $prof | ConvertTo-Json | Out-File $path -Encoding utf8
    $s = $script:str
    $msg = if ($s) { $s.MsgProfilSaved } else { "Profile saved:" }
    [Windows.MessageBox]::Show("$msg`n$path", "WZ PRO  //  PROFIL", "OK", "Information") | Out-Null
}

function Load-WzProfile {
    $dir = "$env:USERPROFILE\.wzpro"
    $s = $script:str
    if (-not (Test-Path $dir)) {
        [Windows.MessageBox]::Show($(if($s){$s.MsgNoProfil}else{"No profile."}), "WZ PRO", "OK", "Warning") | Out-Null; return
    }
    $files = Get-ChildItem $dir -Filter "profile-*.json" -EA SilentlyContinue | Sort-Object LastWriteTime -Descending
    if (-not $files) {
        [Windows.MessageBox]::Show($(if($s){$s.MsgNoProfil}else{"No profile."}), "WZ PRO", "OK", "Warning") | Out-Null; return
    }
    $data = Get-Content $files[0].FullName -Raw | ConvertFrom-Json
    foreach ($k in $script:checkboxes.Keys) {
        $prop = $data.PSObject.Properties[$k]
        if ($prop) { $script:checkboxes[$k].IsChecked = [bool]$prop.Value }
    }
    Update-Status
    $msg = if ($s) { $s.MsgProfilLoaded } else { "Profile loaded:" }
    [Windows.MessageBox]::Show("$msg`n$($files[0].Name)", "WZ PRO  //  PROFIL", "OK", "Information") | Out-Null
}

function Save-RunHistory {
    $dir = "$env:USERPROFILE\.wzpro"
    if (-not (Test-Path $dir)) { New-Item $dir -ItemType Directory -Force | Out-Null }
    $histPath = "$dir\history.json"
    $history  = @()
    if (Test-Path $histPath) {
        try { $history = @(Get-Content $histPath -Raw | ConvertFrom-Json) } catch {}
    }
    $keys = @($script:execOrder | Where-Object { $script:checkboxes.ContainsKey($_) -and $script:checkboxes[$_].IsChecked })
    $entry = [pscustomobject]@{ Date=$( Get-Date -Format "yyyy-MM-dd HH:mm:ss" ); Count=$keys.Count; Keys=($keys -join ",") }
    $history = @($entry) + $history | Select-Object -First 5
    $history | ConvertTo-Json -Depth 3 | Out-File $histPath -Encoding utf8
}

function Show-RunHistory {
    $dir = "$env:USERPROFILE\.wzpro"
    $s = $script:str
    $histPath = "$dir\history.json"
    if (-not (Test-Path $histPath)) {
        [Windows.MessageBox]::Show($(if($s){$s.MsgNoHistory}else{"No history."}), "WZ PRO", "OK", "Information") | Out-Null; return
    }
    try {
        $history = @(Get-Content $histPath -Raw | ConvertFrom-Json)
        $msg = ($history | ForEach-Object { if ($s) { $s.HistoryCountFmt -f $_.Date, $_.Count } else { "$($_.Date)  //  $($_.Count) optimizations" } }) -join "`n"
        $title = if ($s) { $s.HistoryTitle } else { "HISTORY" }
        [Windows.MessageBox]::Show($msg, "WZ PRO  //  $title", "OK", "Information") | Out-Null
    } catch {
        [Windows.MessageBox]::Show($(if($s){$s.MsgNoHistory}else{"No history."}), "WZ PRO", "OK", "Information") | Out-Null
    }
}

function Test-NetworkStability {
    $s = $script:str
    $hosts = @("us.battle.net","eu.battle.net","login.activision.com")
    $lines = foreach ($h in $hosts) {
        $pings = Test-Connection -ComputerName $h -Count 30 -ErrorAction SilentlyContinue
        if ($pings) {
            $times  = @($pings | ForEach-Object { $_.ResponseTime })
            $avg    = [Math]::Round(($times | Measure-Object -Average).Average, 0)
            $min    = ($times | Measure-Object -Minimum).Minimum
            $max    = ($times | Measure-Object -Maximum).Maximum
            $jitter = $max - $min
            $loss   = [Math]::Round((30 - $pings.Count) / 30 * 100, 0)
            "$h`n  AVG ${avg}ms  MIN ${min}ms  MAX ${max}ms  JITTER ${jitter}ms  LOSS ${loss}%"
        } else { "$h`n  TIMEOUT  //  100% packet loss" }
    }
    $title = if ($s) { $s.StabTitle } else { "NETWORK STABILITY" }
    [Windows.MessageBox]::Show($lines -join "`n`n", "WZ PRO  //  $title", "OK", "Information") | Out-Null
}

function Find-OptimalMtu {
    $target = "8.8.8.8"
    $low = 576; $high = 1500; $optimal = 576
    while ($low -le $high) {
        $mid  = [Math]::Floor(($low + $high) / 2)
        $size = $mid - 28
        $r = ping $target -f -l $size -n 2 2>$null
        if ($r -match "Reply from") { $optimal = $mid; $low = $mid + 1 } else { $high = $mid - 1 }
    }
    $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
    foreach ($a in $adapters) {
        netsh interface ipv4 set subinterface "$($a.Name)" mtu=$optimal store=persistent | Out-Null
    }
    $s = $script:str
    $title = if ($s) { $s.MtuTitle } else { "OPTIMAL MTU" }
    $body = if ($s) { $s.MtuResultFmt -f $optimal, ($adapters.Name -join ', ') } else { "Optimal MTU: $optimal bytes`nAdapters: $($adapters.Name -join ', ')" }
    [Windows.MessageBox]::Show($body, "WZ PRO  //  $title", "OK", "Information") | Out-Null
}

function Get-SysInfo {
    $cs   = Get-WmiObject Win32_ComputerSystem -EA SilentlyContinue
    $ram  = [Math]::Round($cs.TotalPhysicalMemory / 1GB, 0)
    $ramSpeedRaw = (Get-WmiObject Win32_PhysicalMemory -EA SilentlyContinue | Measure-Object -Property Speed -Maximum).Maximum
    $ramSpeed = if ($ramSpeedRaw -gt 0) { " @${ramSpeedRaw}MHz" } else { "" }
    $cpu  = (Get-WmiObject Win32_Processor -EA SilentlyContinue | Select-Object -First 1).Name -replace "\s+", " "
    $gpu  = (Get-WmiObject Win32_VideoController -EA SilentlyContinue | Select-Object -First 1).Caption
    $os   = (Get-WmiObject Win32_OperatingSystem -EA SilentlyContinue).Caption -replace "Microsoft Windows ", "WIN "
    $sb   = try { if (Confirm-SecureBootUEFI -EA SilentlyContinue) { "UEFI+SecureBoot" } else { "UEFI" } } catch { "BIOS" }
    $sysInfoTb.Text = "CPU $cpu  //  RAM ${ram}GB${ramSpeed}  //  GPU $gpu  //  $os  //  $sb"
}

function Run-Diagnostics {
    foreach ($k in $script:diagFns.Keys) {
        if (-not $script:diagTbs.ContainsKey($k)) { continue }
        $result = try { & $script:diagFns[$k] } catch { "UNKNOWN" }
        if (($result -eq "UNKNOWN" -or $result -eq "INACTIVE") -and (Test-OptimizationApplied $k)) {
            $result = "APPLIED"
        }
        $s = $script:str
        switch ($result) {
            "ACTIVE"   {
                $script:diagTbs[$k].Text       = if ($s) { $s.DiagActive } else { "● ALREADY ACTIVE" }
                $script:diagTbs[$k].Foreground = $conv.ConvertFromString("#22aa44")
            }
            "APPLIED"  {
                $script:diagTbs[$k].Text       = if ($s) { $s.DiagApplied } else { "● APPLIED" }
                $script:diagTbs[$k].Foreground = $conv.ConvertFromString("#1E1EFF")
            }
            "INACTIVE" {
                $script:diagTbs[$k].Text       = if ($s) { $s.DiagInact } else { "○ NOT APPLIED" }
                $script:diagTbs[$k].Foreground = $conv.ConvertFromString("#a0a0b0")
            }
            default    {
                $script:diagTbs[$k].Text       = if ($s) { $s.DiagUnknown } else { "— UNKNOWN" }
                $script:diagTbs[$k].Foreground = $conv.ConvertFromString("#606070")
            }
        }
    }
}

function Show-LangDialog {
    [xml]$dlgXaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WZ PRO  //  Language / Langue"
        Width="380" Height="500"
        WindowStartupLocation="CenterScreen"
        Background="#0d1526"
        FontFamily="Consolas"
        ResizeMode="NoResize">
  <Grid Margin="24,20,24,20">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>
    <TextBlock Grid.Row="0" Text="WZ PRO" FontSize="22" FontWeight="Bold"
               Foreground="#4a6aff" FontFamily="Consolas" Margin="0,0,0,4"/>
    <Rectangle Grid.Row="1" Height="1" Fill="#1a2a40" Margin="0,0,0,14"/>
    <TextBlock Grid.Row="2" Text="SELECT YOUR COUNTRY / CHOISISSEZ VOTRE PAYS"
               FontFamily="Consolas" FontSize="9" Foreground="#3a5570" Margin="0,0,0,10"/>
    <ListBox x:Name="CountryList" Grid.Row="3"
             Background="#080c16" BorderBrush="#1a2a40" BorderThickness="1"
             Foreground="#8090a0" FontFamily="Consolas" FontSize="12"
             SelectionMode="Single" Padding="0" ScrollViewer.HorizontalScrollBarVisibility="Disabled">
      <ListBox.ItemContainerStyle>
        <Style TargetType="ListBoxItem">
          <Setter Property="Padding" Value="14,8"/>
          <Setter Property="Foreground" Value="#8090a0"/>
          <Setter Property="Background" Value="Transparent"/>
          <Setter Property="FontFamily" Value="Consolas"/>
          <Setter Property="Template">
            <Setter.Value>
              <ControlTemplate TargetType="ListBoxItem">
                <Border x:Name="Bd" Background="{TemplateBinding Background}" Padding="{TemplateBinding Padding}">
                  <ContentPresenter/>
                </Border>
                <ControlTemplate.Triggers>
                  <Trigger Property="IsSelected" Value="True">
                    <Setter TargetName="Bd" Property="Background" Value="#1a2a50"/>
                    <Setter Property="Foreground" Value="#4a6aff"/>
                  </Trigger>
                  <Trigger Property="IsMouseOver" Value="True">
                    <Setter TargetName="Bd" Property="Background" Value="#111e34"/>
                  </Trigger>
                </ControlTemplate.Triggers>
              </ControlTemplate>
            </Setter.Value>
          </Setter>
        </Style>
      </ListBox.ItemContainerStyle>
    </ListBox>
    <Button x:Name="BtnOk" Grid.Row="4" Content="  CONFIRMER / CONFIRM  "
            Margin="0,14,0,0" HorizontalAlignment="Right"
            Background="#1E1EFF" Foreground="#ffffff"
            BorderBrush="#1E1EFF" BorderThickness="1"
            FontFamily="Consolas" FontSize="12" Padding="18,10"
            Cursor="Hand"/>
  </Grid>
</Window>
'@

    $dlgReader = [System.Xml.XmlNodeReader]::new($dlgXaml)
    $dlg       = [Windows.Markup.XamlReader]::Load($dlgReader)
    $dlgList   = $dlg.FindName("CountryList")
    $dlgBtn    = $dlg.FindName("BtnOk")

    $countries = @(
        @{ Name="[ FR ]  France";            Lang="FR" }
        @{ Name="[ FR ]  Belgique";          Lang="FR" }
        @{ Name="[ FR ]  Suisse Romande";    Lang="FR" }
        @{ Name="[ FR ]  Canada (Quebec)";   Lang="FR" }
        @{ Name="[ FR ]  Luxembourg";        Lang="FR" }
        @{ Name="[ EN ]  United Kingdom";    Lang="EN" }
        @{ Name="[ EN ]  United States";     Lang="EN" }
        @{ Name="[ EN ]  Australia";         Lang="EN" }
        @{ Name="[ EN ]  Canada (English)";  Lang="EN" }
        @{ Name="[ EN ]  Ireland";           Lang="EN" }
        @{ Name="[ EN ]  New Zealand";       Lang="EN" }
        @{ Name="[ ES ]  Espana";            Lang="ES" }
        @{ Name="[ ES ]  Mexico";            Lang="ES" }
        @{ Name="[ ES ]  Argentina";         Lang="ES" }
        @{ Name="[ ES ]  Colombia";          Lang="ES" }
        @{ Name="[ DE ]  Deutschland";       Lang="DE" }
        @{ Name="[ DE ]  Oesterreich";       Lang="DE" }
        @{ Name="[ DE ]  Schweiz (DE)";      Lang="DE" }
    )

    foreach ($c in $countries) {
        $item         = [Windows.Controls.ListBoxItem]::new()
        $item.Content = $c.Name
        $item.Tag     = $c.Lang
        $dlgList.Items.Add($item) | Out-Null
    }
    $dlgList.SelectedIndex = 0
    $script:dlgResult = "FR"

    $dlgBtn.Add_Click({
        $sel = $dlgList.SelectedItem
        if ($sel) { $script:dlgResult = $sel.Tag }
        $dlg.DialogResult = $true
    })

    $dlg.ShowDialog() | Out-Null
    return $script:dlgResult
}

# ================================================================
#  EVENEMENTS
# ================================================================

$btnAll.Add_Click({
    $s = $script:str
    $script:activePreset = "CUSTOM / ALL OPTI"
    foreach ($k in $script:checkboxes.Keys) {
        $script:checkboxes[$k].IsChecked = -not ($script:recoveryKeys -contains $k)
    }
    [Windows.MessageBox]::Show(
        $s.MsgAllAdviceB,
        "WZ PRO  //  $($s.MsgAllAdviceT)", "OK", "Warning") | Out-Null
    Update-Status
})

$btnSafe.Add_Click({
    $script:activePreset = "SAFE"
    foreach ($k in $script:checkboxes.Keys) {
        $script:checkboxes[$k].IsChecked = ($script:allOpts[$k].Level -eq 0)
    }
    Update-Status
})

$btnNone.Add_Click({
    $script:activePreset = $null
    foreach ($cb in $script:checkboxes.Values) { $cb.IsChecked = $false }
    Update-Status
})

$btnTheme.Add_Click({
    $next = if ($script:currentTheme -eq "Light") { "Dark" } else { "Light" }
    Switch-Theme $next
})

function Apply-PresetSelection {
    param(
        [string]$Name,
        [string[]]$Keys
    )

    $script:activePreset = $Name
    foreach ($cb in $script:checkboxes.Values) { $cb.IsChecked = $false }
    foreach ($k in $Keys) {
        if ($script:checkboxes.ContainsKey($k)) { $script:checkboxes[$k].IsChecked = $true }
    }
    Update-Status
    if ($script:LogBox) {
        $s = $script:str
        $msg = if ($s) { $s.MsgPresetFmt -f $Name, $Keys.Count } else { "PRESET $Name applied ($($Keys.Count) options)" }
        $script:LogBox.AppendText("`n  >> $msg`n")
        $script:LogScroll.ScrollToEnd()
    }
}

$btnTournoi.Add_Click({
    Apply-PresetSelection "TOURNOI" $script:presets.TOURNOI
})

$btnStream.Add_Click({
    Apply-PresetSelection "STREAMING" $script:presets.STREAMING
})

$btnMaxPerf.Add_Click({
    Apply-PresetSelection "MAX PERF" $script:presets.MAXPERF
})

$btnPing.Add_Click({ Test-NetworkStability })

$btnExport.Add_Click({
    $stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $path  = "$env:USERPROFILE\Desktop\wzpro-log-$stamp.txt"
    $script:LogBox.Text | Out-File -FilePath $path -Encoding utf8
    [Windows.MessageBox]::Show($path, "WZ PRO  //  EXPORT", "OK", "Information") | Out-Null
})

$btnMtu.Add_Click({ Find-OptimalMtu })

$btnHistory.Add_Click({ Show-RunHistory })

$btnSaveProfil.Add_Click({ Save-WzProfile })

$btnLoadProfil.Add_Click({ Load-WzProfile })

$btnSessionStart.Add_Click({
    Apply-PresetSelection "SESSION / TOURNOI" $script:presets.TOURNOI
    $script:sessionActive    = $true
    $btnSessionStart.IsEnabled = $false
    $btnSessionEnd.IsEnabled   = $true
})

$btnSessionInfo = $window.FindName("BtnSessionInfo")
$btnSessionInfo.Add_MouseLeftButtonUp({
    $msg = $script:str.MsgSessionInfo
    [Windows.MessageBox]::Show($msg, "WZ PRO  //  MODE SESSION", "OK", "Information") | Out-Null
})

$btnSessionEnd.Add_Click({
    $script:sessionActive    = $false
    $btnSessionStart.IsEnabled = $true
    $btnSessionEnd.IsEnabled   = $false
    # Remettre les services critiques desactives pendant la session
    foreach ($k in @("RCB","RCC","RCJ")) {
        if ($script:dispatch.ContainsKey($k)) { try { & $script:dispatch[$k] } catch {} }
    }
    [Windows.MessageBox]::Show($script:str.MsgSessionEnded, "WZ PRO  //  SESSION", "OK", "Information") | Out-Null
})

$btnRun.Add_Click({
    $s = $script:str
    $selected = $script:execOrder | Where-Object {
        $script:checkboxes.ContainsKey($_) -and $script:checkboxes[$_].IsChecked -eq $true
    }
    if (-not $selected -or @($selected).Count -eq 0) {
        [Windows.MessageBox]::Show($s.MsgNoSel, "WZ PRO", "OK", "Warning") | Out-Null
        return
    }

    $selectedRecovery = @($selected | Where-Object { $script:recoveryKeys -contains $_ })
    $selectedOpti = @($selected | Where-Object { -not ($script:recoveryKeys -contains $_) })
    if ($selectedRecovery.Count -gt 0 -and $selectedOpti.Count -gt 0) {
        [Windows.MessageBox]::Show(
            $s.MsgMixedSelB,
            "WZ PRO  //  $($s.MsgMixedSelT)", "OK", "Warning") | Out-Null
        return
    }

    if (@($selected).Count -gt 12) {
        $resultBulk = [Windows.MessageBox]::Show(
            ($s.MsgBulkFmt -f @($selected).Count),
            "WZ PRO  //  $($s.MsgBulkT)", "YesNo", "Warning")
        if ($resultBulk -ne "Yes") { return }
    }

    $btnRun.IsEnabled = $false
    $script:LogBox.Text = ""
    $script:LogBox.AppendText("$($s.LogBand)`n")
    $window.Dispatcher.Invoke([action]{}, [Windows.Threading.DispatcherPriority]::Background)

    try {
        Enable-ComputerRestore -Drive "C:\" -ErrorAction Stop
        Checkpoint-Computer -Description "WZ PRO - $(Get-Date -f 'yyyy-MM-dd HH:mm')" `
            -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
        $script:LogBox.AppendText("$($s.LogRestore)`n")
    } catch {
        $script:LogBox.AppendText("$($s.LogResFail)`n")
    }
    $script:LogScroll.ScrollToEnd()
    $window.Dispatcher.Invoke([action]{}, [Windows.Threading.DispatcherPriority]::Background)

    foreach ($k in $selected) {
        $opt = $script:allOpts[$k]
        if ($opt.Level -ge 1) {
            $optName = if ($script:optShortLang.ContainsKey($k) -and $script:optShortLang[$k].ContainsKey($script:currentLang)) {
                $script:optShortLang[$k][$script:currentLang]
            } else { $opt.Short }
            $disc   = if ($opt.PSObject.Properties.Name -contains "Disclaimer") { "`n`n" + $opt.Disclaimer } else { "" }
            $result = [Windows.MessageBox]::Show(
                "$($s.WarnTitle)`n`n$optName$disc`n`n$($s.MsgWarnQ)",
                "WZ PRO  //  $($s.MsgWarnT)", "YesNo", "Warning")
            if ($result -ne "Yes") {
                $script:LogBox.AppendText("$($s.LogIgnore)$optName`n")
                $script:LogScroll.ScrollToEnd()
                continue
            }
        }
        try {
            & $script:dispatch[$k]
            Mark-OptimizationApplied $k
            if ($script:runTbs.ContainsKey($k)) {
                $script:runTbs[$k].Text       = $s.RunOk
                $script:runTbs[$k].Foreground = $conv.ConvertFromString("#22aa44")
            }
        } catch {
            if ($script:runTbs.ContainsKey($k)) {
                $script:runTbs[$k].Text       = $s.RunErr
                $script:runTbs[$k].Foreground = $conv.ConvertFromString("#cc0000")
            }
        }
        $window.Dispatcher.Invoke([action]{}, [Windows.Threading.DispatcherPriority]::Background)
    }

    $script:LogBox.AppendText("`n$($s.LogDone)`n")
    $script:LogScroll.ScrollToEnd()
    $btnRun.IsEnabled = $true

    Save-RunHistory
    Run-Diagnostics
    Update-PerfScore

    [Windows.MessageBox]::Show($s.MsgDoneB, "WZ PRO  //  $($s.MsgDoneT)", "OK", "Information") | Out-Null
})

# ================================================================
#  LANCEMENT
# ================================================================

# 1. Dialog de selection de langue/pays
$detectedLang = Show-LangDialog

# 2. Auto-theme selon l'heure locale (Light 08h-18h, Dark sinon)
$hour = [DateTime]::Now.Hour
$autoTheme = if ($hour -ge 8 -and $hour -lt 18) { "Light" } else { "Dark" }
Switch-Theme $autoTheme

# 3. Appliquer la langue selectionnee (met a jour tous les textes)
Apply-Language $detectedLang

# 4. Info systeme dans le header
Get-SysInfo

# 5. Diagnostic initial : etat actuel de chaque optimisation
Run-Diagnostics

# 6. Score de performance initial
Update-PerfScore

# 7. Verifier si un redemarrage est en attente
Check-PendingReboot

$window.ShowDialog() | Out-Null
