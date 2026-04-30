const vscode = require('vscode');
const {parseRemindLine, loadReminders, saveReminders} = require('./src/reminders')

function highlighttodo(editor,todoDecoration, remindDecoration, reminderSetDecoration){
    if(!editor)return
    const todoranges=[]
	const remindRanges=[]
	const reminderSetRanges= []
    for(let i=0;i<editor.document.lineCount;i++){
        const line=editor.document.lineAt(i).text;
        const todo=line.match(/\/\/\s*TODO.*/i);
        if(todo) {
            const start=line.indexOf(todo[0])
            todoranges.push(new vscode.Range(i,start,i,start+todo[0].length))
        }

		const remind=line.match(/\/\/\s*#REMIND/i);
		if(remind){
			const start=line.indexOf(remind[0])
			remindRanges.push(new vscode.Range(i,start,i,start+remind[0].length));
		}

		const reminderSet=line.match(/\/\/\s*REMINDER SET:.*/i);
		if(reminderSet){
			const start=line.indexOf(reminderSet[0])
			reminderSetRanges.push(new vscode.Range(i,start,i,start+reminderSet[0].length))
		}

    }
    editor.setDecorations(todoDecoration,todoranges)
    editor.setDecorations(remindDecoration,remindRanges)
	editor.setDecorations(reminderSetDecoration,reminderSetRanges);
}

function formatCountdown(ms){
	if(ms<=0) return '0s'
	const totalS=Math.ceil(ms/1000)
	const h=Math.floor(totalS/3600)
	const m=Math.floor((totalS%3600)/60)
	const s=totalS%60
	if(h>0) return `${h}h ${m}m`
	if(m>0) return `${m}m ${s}s`
	return `${s}s`
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

	const reminderSetDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor:'rgba(255,165,0,0.15)',
		color: '#ffaa00',
		fontWeight:'bold',
		borderRadius: '3px',
		margin: '0 2px',
		border: '1px solid rgba(255,165,0,0.5)'
	})

	const statusBarItem=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right,100)
	context.subscriptions.push(statusBarItem)

	if (vscode.window.activeTextEditor) {
        highlighttodo(vscode.window.activeTextEditor, todoDecoration, remindDecoration, reminderSetDecoration);
    }

    vscode.window.onDidChangeActiveTextEditor(e=>highlighttodo(e,todoDecoration,remindDecoration, reminderSetDecoration),null,context.subscriptions)
    // vscode.workspace.onDidChangeTextDocument(()=>highlighttodo(vscode.window.activeTextEditor,todoDecoration,remindDecoration),null,context.subscriptions) //purano code

	let typingTimeout;
	let handledLines= new Set();

	vscode.workspace.onDidChangeTextDocument(event=>{
		const editor=vscode.window.activeTextEditor;
		if(editor && event.document===editor.document){
			highlighttodo(editor,todoDecoration,remindDecoration, reminderSetDecoration);

			const changeStart=event.contentChanges[0]?.range.start.line;
			if(changeStart==null) return;

			const lineText=editor.document.lineAt(changeStart).text;

			const hasRemind=/\/\/\s*#REMIND\s*$/i.test(lineText.trim());
			const lineKey=`${event.document.uri.toString()}:${changeStart}`;
			if(hasRemind&&!handledLines.has(lineKey)){
				handledLines.add(lineKey)
				clearTimeout(typingTimeout)
				typingTimeout=setTimeout(async ()=>{
					const input=await vscode.window.showInputBox({
						prompt: "set reminder: [time][unit] [topic] (e.g.: 10m devlog this update)",
						placeHolder: "10m devlog this update",
					})

					if(input){
						const dummyline=`// #REMIND ${input}`;
						const data=parseRemindLine(dummyline)
						if(data){
							const originalLine = editor.document.lineAt(changeStart).text;
							const indent=originalLine.match(/^(\s*)/)[1];
							const edit=new vscode.WorkspaceEdit();
							const lineRange= editor.document.lineAt(changeStart).range;
							edit.replace(editor.document.uri, lineRange,`${indent}// REMINDER SET: ${data.topic} IN ${data.displayTime}`);
							await vscode.workspace.applyEdit(edit);

							const currRems=loadReminders(context);
							currRems.push(data)
							saveReminders(context,currRems)
							vscode.window.setStatusBarMessage(`$(clock) reminder set: ${data.topic} in ${data.displayTime}`,4000);
						} else {
							vscode.window.showErrorMessage('invalid format. use [time][unit] [topic] e.g.: 10s this is topic, 5m need to do this, 1h do this after an hour');
							handledLines.delete(lineKey)
						}
					} else {
						handledLines.delete(lineKey)
					}
				},600);
			}

			if(lineText.includes('#REMIND')&& !lineText.includes('REMINDER SET')){
				handledLines.delete(lineKey)
			}
		}
	}, null, context.subscriptions);

	const intvl=setInterval(() => {
		const reminders=loadReminders(context);

		// console.log('interval tick.reminders: ',JSON.stringify(reminders)); //for debuggin
		if(reminders.length===0){
			statusBarItem.hide()
			return;
		}
		const now=Date.now();
		const stillPending= [];
		let changed =false;

		reminders.forEach(r=>{ 
			// console.log(`checking: ${r.topic}|now:${now}|triggerAt:${r.triggerAt}|diff:${r.triggerAt-now}ms`)//de buggg
			if(now>=r.triggerAt){
				// console.log('FIRING NOTIFICATIN FOR:',r.topic) //for debugginggg
				vscode.window.showWarningMessage(`⌚ REMINDER: ${r.topic}`,{modal:false},'Dismiss');
				changed=true;
			} else {                  
				stillPending.push(r);
			} 
		})    

		if(changed){
			saveReminders(context,stillPending);
		}

		if(stillPending.length>0){
			const soonest=stillPending.reduce((a,b)=>a.triggerAt<b.triggerAt?a:b)
			const remaining=soonest.triggerAt-now;
			statusBarItem.text=`$(clock) ${soonest.topic}: ${formatCountdown(remaining)}`
			statusBarItem.tooltip=`Reminder: ${soonest.topic}. Fires in ${formatCountdown(remaining)}`
			statusBarItem.show()
		} else {
			statusBarItem.hide();
		}
	}, 3000);

	context.subscriptions.push({dispose: () => clearInterval(intvl)});


	context.subscriptions.push(
		vscode.commands.registerCommand('extension.removeResidue',async ()=>{
			const editor=vscode.window.activeTextEditor;
			if(!editor)return;
			const edit=new vscode.WorkspaceEdit();
			const document=editor.document;

			for(let i=0;i<document.lineCount;i++){
				const line=document.lineAt(i);
				if(/\/\/\s*REMINDER SET:.*/i.test(line.text)){
					const range=line.rangeIncludingLineBreak;
					edit.delete(document.uri,range);
				}
			}

			await vscode.workspace.applyEdit(edit)
			vscode.window.showInformationMessage('CLEANED UP REMINDER RESIDUES!!');
		})
	)
}

function deactivate() {
}

module.exports = {activate,deactivate};
