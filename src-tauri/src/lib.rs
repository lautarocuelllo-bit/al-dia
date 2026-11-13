use tauri::{
    Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

// ---------- Sesión del campus en el llavero del sistema ----------
// Se guarda el token que da Moodle (nunca la contraseña).

const SERVICIO: &str = "com.genesiscodestudio.aldia";
const CUENTA: &str = "sesion-moodle";

fn entrada() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICIO, CUENTA).map_err(|e| e.to_string())
}

#[tauri::command]
fn guardar_secreto(valor: String) -> Result<(), String> {
    entrada()?.set_password(&valor).map_err(|e| e.to_string())
}

#[tauri::command]
fn leer_secreto() -> Result<Option<String>, String> {
    match entrada()?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn borrar_secreto() -> Result<(), String> {
    match entrada()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// ---------- Ventana ----------

fn mostrar(app: &tauri::AppHandle) {
    if let Some(v) = app.get_webview_window("main") {
        let _ = v.unminimize();
        let _ = v.show();
        let _ = v.set_focus();
    }
}

fn alternar(app: &tauri::AppHandle) {
    if let Some(v) = app.get_webview_window("main") {
        if v.is_visible().unwrap_or(false) && !v.is_minimized().unwrap_or(false) {
            let _ = v.hide();
        } else {
            mostrar(app);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Si ya está abierta, abrirla de nuevo muestra la ventana que existe
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| mostrar(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--oculta"]),
        ))
        .invoke_handler(tauri::generate_handler![guardar_secreto, leer_secreto, borrar_secreto])
        .setup(|app| {
            // Ícono en la bandeja: clic para mostrar/esconder, menú con Salir
            let abrir = MenuItem::with_id(app, "abrir", "Abrir Al Día", true, None::<&str>)?;
            let salir = MenuItem::with_id(app, "salir", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&abrir, &salir])?;
            TrayIconBuilder::with_id("principal")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Al Día")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "abrir" => mostrar(app),
                    "salir" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        alternar(tray.app_handle());
                    }
                })
                .build(app)?;

            // Al iniciar con la compu arranca escondida en la bandeja
            if !std::env::args().any(|a| a == "--oculta") {
                mostrar(app.handle());
            }
            Ok(())
        })
        .on_window_event(|ventana, evento| {
            // Cerrar la esconde: sigue en la bandeja para los recordatorios
            if let WindowEvent::CloseRequested { api, .. } = evento {
                api.prevent_close();
                let _ = ventana.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar Al Día");
}
