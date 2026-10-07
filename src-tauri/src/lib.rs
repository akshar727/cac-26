// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create projects table",
            kind: MigrationKind::Up,
            sql: "
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    broadcasts_json TEXT  DEFAULT '[]'
                );
            ",
        },
        Migration {
            version: 2,
            description: "create sprites table",
            kind: MigrationKind::Up,
            sql: "
                CREATE TABLE IF NOT EXISTS sprites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    project_id INTEGER NOT NULL,
                    blocks_json TEXT DEFAULT '[]',
                    image_paths TEXT  DEFAULT '[]',
                    variables_map TEXT  DEFAULT '[]',
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );
            ",
        },
        Migration {
            version: 3,
            description: "create backdrops table",
            kind: MigrationKind::Up,
            sql: "
                CREATE TABLE IF NOT EXISTS backdrops (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    project_id INTEGER NOT NULL,
                    blocks_json TEXT DEFAULT '[]',
                    image_paths TEXT DEFAULT '[]',
                    variables_map TEXT DEFAULT '[]',
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );
            ",
        },
    ];

    let _lesson_migrations = vec![Migration {
        version: 1,
        description: "create lessons table",
        kind: MigrationKind::Up,
        sql: "CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    
    allowed_blocks TEXT NOT NULL,      
    instructions TEXT NOT NULL,        
    success_metrics TEXT NOT NULL,     
    
    base_state TEXT NOT NULL,          
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

            ",
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        // .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:codely.db", migrations)
                // .add_migrations("sqlite:lessons.db", lesson_migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
