export const PERSONAL_TASK_BOARD={id:'',title:'Personal task',columns:[{id:'personal_todo',title:'TO-DO'},{id:'personal_progress',title:'IN PROGRESS'},{id:'personal_review',title:'REVIEW'},{id:'personal_done',title:'COMPLETED'}]};
export const taskBoardFor=(task,boards)=>task?.boardId===''?PERSONAL_TASK_BOARD:boards.find(board=>board.id===task?.boardId);
