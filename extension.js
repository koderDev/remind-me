const vscode = require('vscode');
const {parseRemindLine, loadReminders, saveReminders} = require('./src/reminders')

function highlighttodo(editor,todoDecoration, remindDecoration){
    if(!editor)return
    const todoranges=[]
	const remindRanges=[]
    for(let i=0;i<editor.document.lineCount;i++){
        const line=editor.document.lineAt(i).text;
        const todo=line.match(/\/\/\s*TODO.*/i);
        if(todo) {
            const start=line.indexOf(todo[0])
            todoranges.push(new vscode.Range(i,start,i,start+todo[0].length))
        }

		const remind=line.match(/\/\/\s*#REMIND\s+(\d*\.?\d+)\s*([smh])\s+(.+)/i);
		if(remind){
			const start=line.indexOf(remind[0])
			remindRanges.push(new vscode.Range(i,start,i,start+remind[0].length));
		}
    }
    editor.setDecorations(todoDecoration,todoranges)
    editor.setDecorations(remindDecoration,remindRanges)
}

function activate(context){
    console.log('IT WORKS woohoohoho')

	const todoDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: new vscode.ThemeColor('badge.background'),
		color: new vscode.ThemeColor('badge.foreground'),
		fontWeight: 'bold',
		borderRadius: '3px',
		margin: '0 2px',
		border: '1px solid rgba(255,255,255,0.1)'		
	})

	const remindDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255, 17, 17, 0.2)',
		color: '#ff3333',
		fontWeight: 'bold',
		borderRadius: '3px',
		margin: '0 2px',
		border: '1px solid rgba(255, 17, 17, 0.61)'		
	})


	if (vscode.window.activeTextEditor) {
        highlighttodo(vscode.window.activeTextEditor, todoDecoration, remindDecoration);
    }

    vscode.window.onDidChangeActiveTextEditor(e=>highlighttodo(e,todoDecoration,remindDecoration),null,context.subscriptions)
    // vscode.workspace.onDidChangeTextDocument(()=>highlighttodo(vscode.window.activeTextEditor,todoDecoration,remindDecoration),null,context.subscriptions)

	let typingTimeout;

	vscode.workspace.onDidChangeTextDocument(event=>{
		const editor=vscode.window.activeTextEditor;
		if(editor && event.document===editor.document){
			highlighttodo(editor,todoDecoration,remindDecoration);

			// const lastChange=event.contentChanges[0]?.text;
			const changeStart=event.contentChanges[0]?.range.start.line;
			const lineText=changeStart!=null?editor.document.lineAt(changeStart).text:'';
			if(lineText.includes("#REMIND")){
				clearTimeout(typingTimeout)
				typingTimeout=setTimeout(async () =>{
					const input=await vscode.window.showInputBox({
						prompt: "enter reminder: [time][unit] [topic] (e.g. 10m devlog this update)",
						placeHolder: "10m devlog this update",
					})

					if(input){
						const dummyline=`// #REMIND ${input}`;
						const data=parseRemindLine(dummyline);
						if(data){
							const currRems=loadReminders(context)
							currRems.push(data)
							saveReminders(context,currRems)
							vscode.window.setStatusBarMessage(`$(clock) reminder set for ${data.topic}`,5000);
						} else {
							vscode.window.showErrorMessage('invalid format. use [time][unit] [reminder] format e.g. 10s,5m,1h followed by a topic');
						}
					}
				},1500);
			}
		}
	}, null, context.subscriptions);

	const intvl=setInterval(() => {
		const reminders=loadReminders(context);
		if(reminders.length===0) return;
		const now=Date.now();
		const stillPending=[];
		let changed=false;

		reminders.forEach(r=>{ 
			if(now>=r.triggerAt){
				vscode.window.showWarningMessage(`REMINDER: ${r.topic}`);
				changed=true;
			} else {                  
				stillPending.push(r);
			} 
		})    

		if(changed){
			saveReminders(context,stillPending);
		}
	}, 3000);

	context.subscriptions.push({dispose: () => clearInterval(intvl)});
}


function deactivate() {
}

module.exports = {activate,deactivate};