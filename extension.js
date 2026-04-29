const vscode = require('vscode');

function highlighttodo(editor,todoDecoration){
    if(!editor)return
    const ranges=[]
    for(let i=0;i<editor.document.lineCount;i++){
        const line=editor.document.lineAt(i).text;
        const match=line.match(/\/\/\s*TODO.*/i);
        if(match) {
            const start=line.indexOf(match[0])
            ranges.push(new vscode.Range(i,start,i,start+match[0].length))
        }
    }
    editor.setDecorations(todoDecoration,ranges)
}


function activate(context){
    console.log('IT WORKS')

	const todoDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255,200,0,0.3)',
		color: '#000',
		fontWeight: 'bold'
	})
    highlighttodo(vscode.window.activeTextEditor,todoDecoration)

    vscode.window.onDidChangeActiveTextEditor(e=>highlighttodo(e,todoDecoration),null,context.subscriptions)
    vscode.workspace.onDidChangeTextDocument(()=>highlighttodo(vscode.window.activeTextEditor,todoDecoration),null,context.subscriptions)

	context.subscriptions.push(todoDecoration);
}


function deactivate() {
}

module.exports = {activate,deactivate};