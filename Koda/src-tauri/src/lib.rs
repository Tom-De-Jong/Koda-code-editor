// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use rfd::FileDialog;
use serde::Serialize;
use serde_json::json;
use std::env;
use std::fs;
use std::path::Path;

// open file
#[tauri::command(rename_all = "snake_case")]
fn get_text_file() -> serde_json::Value {
    let mut files = FileDialog::new()
        .add_filter(
            "text",
            &[
                "txt", "md", "markdown", "log", "cfg", "ini", "json", "yml", "yaml", "xml", "toml",
                "csv", "tsv", "js", "ts", "jsx", "tsx", "html", "htm", "css", "scss", "less", "rs",
                "py", "rb", "java", "kt", "c", "h", "cpp", "hpp", "cc", "go", "swift", "php", "sh",
                "bash", "zsh", "fish", "sql",
            ],
        )
        .set_directory("/")
        .pick_file();

    if files.is_none() {
        return json!({
            "contents": "",
            "filepath": ""
        });
    }

    let path_str = files.as_mut().unwrap().display().to_string();


    let contents = fs::read_to_string(files.as_mut().unwrap().display().to_string())
        .expect("Should have been able to read the file");


    let result = json!({
        "contents": contents,
        "filepath": path_str
    });

    result
}

#[tauri::command(rename_all = "snake_case")]
fn get_text_file_by_path(path: String) -> serde_json::Value {
    let contents = fs::read_to_string(&path).unwrap_or_else(|_| "".to_string());

    json!({
        "contents": contents,
        "filepath": path
    })
}

//save file
#[tauri::command(rename_all = "snake_case")]
fn save_text_file(file_path: String, text: String) {
    // println!("In file {file_path}");

    fs::write(&file_path, &text).expect("Should have been able to write the file");

    // println!("wrote file successfully");
}

//save file as
#[tauri::command(rename_all = "snake_case")]
fn save_text_file_as(text: String) {
    let mut save_dir = FileDialog::new()
        .add_filter(
            "text",
            &[
                "txt", "md", "markdown", "log", "cfg", "ini", "json", "yml", "yaml", "xml", "toml",
                "csv", "tsv", "js", "ts", "jsx", "tsx", "html", "htm", "css", "scss", "less", "rs",
                "py", "rb", "java", "kt", "c", "h", "cpp", "hpp", "cc", "go", "swift", "php", "sh",
                "bash", "zsh", "fish", "sql",
            ],
        )
        .set_directory("/")
        .save_file();

    if save_dir.is_none() {
        println!("Save canceled");
        return;
    }

    let file_path = save_dir.as_mut().unwrap().display().to_string();
    fs::write(&file_path, &text).expect("Should have been able to write the file");
}

#[derive(Serialize)]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

fn dir_entries(path: &str) -> Vec<DirEntry> {
    let mut entries: Vec<DirEntry> = Vec::new();

    if let Ok(paths) = fs::read_dir(path) {
        for entry in paths.flatten() {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let path_str = entry_path.display().to_string();
            let is_dir = entry_path.is_dir();

            entries.push(DirEntry {
                name,
                path: path_str,
                is_dir,
            });
        }
    }

    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    let parent = Path::new(path)
        .parent()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|| "/".to_string());

    entries.insert(
        0,
        DirEntry {
            name: "..".to_string(),
            path: parent,
            is_dir: true,
        },
    );

    entries
}

#[tauri::command(rename_all = "snake_case")]
fn get_dirtree_start() -> serde_json::Value {
    let tree = dir_entries("/home");
    json!(tree)
}

#[tauri::command(rename_all = "snake_case")]
fn get_dirtree(path: String) -> serde_json::Value {
    let tree = dir_entries(&path);
    json!(tree)
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_text_file,
            get_text_file_by_path,
            save_text_file,
            save_text_file_as,
            get_dirtree_start,
            get_dirtree
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
