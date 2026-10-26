import type {Board,Task} from '../src/features/taskOrbit/types/task';
export const PERSONAL_TASK_BOARD: Board;
export function taskBoardFor(task: Pick<Task,'boardId'> | undefined, boards: Board[]): Board | undefined;
