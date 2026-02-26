const { invoke } = window.__TAURI__.core;

let markdownPreview = document.querySelector(".markdownPreview")
let markdownMode = false;
let currentPath = "/home/tom";
let currentFilePath = "";
let editor = null;
let monacoReady = null;

console.log("script works girly")

function initMonaco() {
  if (monacoReady) return monacoReady;

  monacoReady = new Promise((resolve) => {
    if (!window.require) return resolve();

    window.require.config({
      paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.53.0/min/vs",
      },
    });

    window.require(["vs/editor/editor.main"], () => {
      editor = monaco.editor.create(document.getElementById("editor"), {
        value: "",
        language: "plaintext",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
      });

      editor.onDidChangeModelContent(() => {
        if (markdownMode) updateMarkdown();
        updateWordCount();
      });

      resolve();
    });
  });

  return monacoReady;
}

function getEditorValue() {
  if (!editor) return "";
  return editor.getValue();
}

function setEditorValue(value) {
  if (!editor) return;
  editor.setValue(value);
}

function updateWordCount() {
  let wordCount = getEditorValue()
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length + " wrds";
  document.querySelector(".wordCount").innerHTML = wordCount;
}

function updateMarkdown() {
  let mdValue = getEditorValue();

  mdValue = mdValue.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  mdValue = mdValue.replace(/^######\s?(.*)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s?(.*)$/gm, "<h5>$1</h5>")
    .replace(/^####\s?(.*)$/gm, "<h4>$1</h4>")
    .replace(/^###\s?(.*)$/gm, "<h3>$1</h3>")
    .replace(/^##\s?(.*)$/gm, "<h2>$1</h2>")
    .replace(/^#\s?(.*)$/gm, "<h1>$1</h1>")
    .replace(/^>\s?(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^(?:\*|\+|-)\s+(.*)$/gm, '<li data-ul="1">$1</li>')
    .replace(/^\d+\.\s+(.*)$/gm, '<li data-ol="1">$1</li>');

  mdValue = mdValue.replace(/(<li data-ul="1">.*<\/li>\n?)+/g, (match) => {
    return "<ul>" + match.replace(/ data-ul="1"/g, "") + "</ul>";
  });

  mdValue = mdValue.replace(/(<li data-ol="1">.*<\/li>\n?)+/g, (match) => {
    return "<ol>" + match.replace(/ data-ol="1"/g, "") + "</ol>";
  });

  mdValue = mdValue.replace(/\n/g, "<br>");
  markdownPreview.innerHTML = mdValue;
}

function setEditorLanguageFromPath(path) {
  if (!editor || !path) return;

  const ext = path.split(".").pop().toLowerCase();
  const map = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    rs: "rust",
    py: "python",
    rb: "ruby",
    java: "java",
    kt: "kotlin",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cc: "cpp",
    go: "go",
    php: "php",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    xml: "xml",
    sql: "sql",
  };

  const lang = map[ext] || "plaintext";
  monaco.editor.setModelLanguage(editor.getModel(), lang);
}

initMonaco();



//get all dirs and puts them in dirtree bar
function parentPath(p) {
  if (!p || p === "/") return "/";
  return p.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
}

function renderTree(entries) {
  const fileTree = document.querySelector(".filetree");
  fileTree.innerHTML = "";

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    let newDirItem = document.createElement("div");
    newDirItem.className = "dirTreeItem";
    newDirItem.innerHTML = entry.name;

    //onclick directory or file open
    newDirItem.addEventListener("click", (event) => {
      if (entry.is_dir) {
        const nextPath = entry.name === ".." ? parentPath(currentPath) : entry.path;

        invoke("get_dirtree", { path: nextPath }).then((message) => {
          currentPath = nextPath;
          renderTree(message);
        });
      } else {
        invoke("get_text_file_by_path", { path: entry.path }).then((message) => {
          let content = message.contents || "";
          let filepath = message.filepath || "";

          currentFilePath = filepath;
          monacoReady.then(() => {
            setEditorValue(content);
            setEditorLanguageFromPath(filepath);
            if (markdownMode) updateMarkdown();
            updateWordCount();
          });
        });
      }
    })

    fileTree.appendChild(newDirItem);
  }
}

//get all dirs and puts them in dirtree bar
invoke("get_dirtree_start").then((message) => {
  console.log(message);
  renderTree(message);
})



//saves the file to the path when topbar save button is clicked
document.querySelector(".saveFile").addEventListener("click", () => {
  saveFile();
})


//function for saving files
function saveFile() {
  let text = getEditorValue();
  if (!currentFilePath) return;
  invoke('save_text_file', { file_path: currentFilePath, text: text })
}

// ctrl + thing functions
document.onkeydown = keydown;

let zoomnumber = 1;

function keydown(evt) {
  evt = evt || window.event;

  if (evt.ctrlKey && evt.keyCode == 83) { //CTRL+S
    saveFile();
    alert("File saved");

  } else if (evt.ctrlKey && (evt.keyCode == 61 || evt.keyCode == 187)) {

    if (zoomnumber <= 5) {
      zoomnumber += 0.5;
      document.querySelector(".textWrapper").style.zoom = zoomnumber;
      console.log(zoomnumber);
      //zoom in
    }

  } else if (evt.ctrlKey && (evt.keyCode == 173 || evt.keyCode == 189)) {

    if (zoomnumber >= 1) {
      zoomnumber -= 0.5;
      document.querySelector(".textWrapper").style.zoom = zoomnumber;
      console.log(zoomnumber);
      //zoom out
    }

  }

}


//save file as
document.querySelector(".saveFileAs").addEventListener("click", () => {
  let text = getEditorValue();
  invoke('save_text_file_as', { text: text })
})

//opens file from filepath
document.querySelector(".openFile").addEventListener("click", () => {
  console.log("clicked");

  let filepath = "" //temporary
  invoke('get_text_file').then((message) => {
    console.log(message)
    let content = message.contents;
    let filepath = message.filepath;

    currentFilePath = filepath;
    monacoReady.then(() => {
      setEditorValue(content);
      setEditorLanguageFromPath(filepath);
      if (markdownMode) updateMarkdown();
      updateWordCount();
    });
  });;


})

//opens dirtree
document.querySelector(".dirtree").addEventListener("click", () => {
  if (document.querySelector(".filetree").style.display == "block") {
    document.querySelector(".filetree").style.display = "none";
  } else {
    document.querySelector(".filetree").style.display = "block";
  }

});

//turn on or off markdown
document.querySelector(".switchMarkdown").addEventListener("click", () => {
  markdownMode = !markdownMode;
  if (markdownMode == true) {
    document.querySelector(".markdownPreview").style.display = "block";
    updateMarkdown();
  } else {
    document.querySelector(".markdownPreview").style.display = "none";
  }
})