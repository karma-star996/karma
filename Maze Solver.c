/*
 * ============================================================
 *   VISUAL MAZE SOLVER - Dev-C++ / MinGW Compatible
 *   Uses: Stack (DFS - All Paths) + Queue (BFS - Shortest Path)
 * ============================================================
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>

/* --- Constants ------------------------------------------- */
#define MAZE_MAX_PATH  500
#define MAX_ROWS        15
#define MAX_COLS        15
#define MAX_QUEUE     5000
#define MAX_STACK     5000
#define MAX_PATHS       50

#define WALL  '#'
#define START 'S'
#define END   'E'
#define PATH  '*'

#define COLOR_DEFAULT  7
#define COLOR_WALL     8
#define COLOR_OPEN    15
#define COLOR_START   10
#define COLOR_END     12
#define COLOR_PATH    14
#define COLOR_VISITED  3
#define COLOR_TITLE   11

/* Single macro replaces setColor() + resetColor() */
#define SET_COLOR(c) SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), (c))
#define RESET_COLOR  SET_COLOR(COLOR_DEFAULT)

/* --- Structures ------------------------------------------- */

typedef struct { int row, col; } Point;

typedef struct {
    Point pos;
    Point path[MAZE_MAX_PATH];
    int   pathLen;
} QueueNode;

typedef struct {
    QueueNode data[MAX_QUEUE];
    int front, rear;
} Queue;

typedef struct {
    Point pos;
    Point path[MAZE_MAX_PATH];
    int   pathLen;
    int   visited[MAX_ROWS][MAX_COLS];
} StackNode;

typedef struct {
    StackNode data[MAX_STACK];
    int top;
} Stack;

/* --- Globals --------------------------------------------- */

int   numRows, numCols;
char  maze[MAX_ROWS][MAX_COLS + 1];
char  displayMaze[MAX_ROWS][MAX_COLS + 1];
Point startPos, endPos;

Point allPaths[MAX_PATHS][MAZE_MAX_PATH];
int   allPathLens[MAX_PATHS];
int   totalPaths;

/* --- Maze Data ------------------------------------------- */

#define NUM_MAZES 5

const char *mazeData[NUM_MAZES][MAX_ROWS] = {
    { "#######", "#S    #", "# ### #", "#   # #", "### # #", "#     E", "#######", NULL },
    { "#########", "#S  #   #", "#   #   #", "# ### ###", "#       #", "### # ###", "#   #   #", "#   # E #", "#########", NULL },
    { "###########", "#S        #", "# ####### #", "# #     # #", "# # ### # #", "#   # #   #", "##### # ###", "#   # #   #", "# # ### # #", "# #     #E#", "###########", NULL },
    { "#############", "#S  #   #   #", "# # # # # # #", "# #   #   # #", "# ######### #", "#           #", "######### ###", "#   #   #   #", "# #   # # #E#", "#############", NULL },
    { "###########", "#S# #     #", "# # # ### #", "#   #   # #", "####### # #", "#       # #", "# ####### #", "#   #     #", "### # ### #", "#         E", "###########", NULL }
};

const char *mazeTitles[NUM_MAZES] = {
    "Maze 1: The Beginner's Path  (7x7)",
    "Maze 2: The Crossroads       (9x9)",
    "Maze 3: The Spiral           (11x11)",
    "Maze 4: The Web              (9x13)",
    "Maze 5: The Dead End Trap    (11x11)"
};

/* --- printMaze -------------------------------------------- */

void printMaze(char m[MAX_ROWS][MAX_COLS + 1]) {
    int r, c, hu, hd, hl, hr;
    char wch;
    printf("\n");
    for (r = 0; r < numRows; r++) {
        printf("  ");
        for (c = 0; c < (int)strlen(m[r]); c++) {
            char ch = m[r][c];
            switch (ch) {
                case '#':
                    hu = (r > 0         && maze[r-1][c] == WALL);
                    hd = (r < numRows-1 && maze[r+1][c] == WALL);
                    hl = (c > 0         && maze[r][c-1] == WALL);
                    hr = (c < (int)strlen(maze[r])-1 && maze[r][c+1] == WALL);
                    if      ((hl||hr) && (hu||hd)) wch = '+';
                    else if  (hl||hr)              wch = '-';
                    else if  (hu||hd)              wch = '|';
                    else                           wch = '+';
                    SET_COLOR(COLOR_WALL);    printf("%c", wch); break;
                case 'S': SET_COLOR(COLOR_START);   printf("%c", ch); break;
                case 'E': SET_COLOR(COLOR_END);     printf("%c", ch); break;
                case '*': SET_COLOR(COLOR_PATH);    printf("%c", ch); break;
                case '.': SET_COLOR(COLOR_VISITED); printf("%c", ch); break;
                default:  SET_COLOR(COLOR_OPEN);    printf("%c", ch); break;
            }
        }
        RESET_COLOR;
        printf("\n");
    }
    printf("\n");
}

/* --- Macros: copy+overlay, print steps, load maze --------- */

#define COPY_OVERLAY(pathArr, pathLen) do {                              \
    int _r, _i;                                                          \
    for (_r = 0; _r < numRows; _r++) strcpy(displayMaze[_r], maze[_r]); \
    for (_i = 1; _i < (pathLen) - 1; _i++)                              \
        if (displayMaze[(pathArr)[_i].row][(pathArr)[_i].col] != START &&\
            displayMaze[(pathArr)[_i].row][(pathArr)[_i].col] != END)    \
            displayMaze[(pathArr)[_i].row][(pathArr)[_i].col] = PATH;    \
} while(0)

#define PRINT_STEPS(pathArr, pathLen) do {                               \
    int _i;                                                              \
    printf("  Steps: ");                                                 \
    for (_i = 0; _i < (pathLen); _i++) {                                 \
        printf("(%d,%d)", (pathArr)[_i].row, (pathArr)[_i].col);         \
        if (_i < (pathLen)-1) printf(" -> ");                            \
        if ((_i+1) % 5 == 0 && _i < (pathLen)-1) printf("\n         "); \
    }                                                                    \
    printf("\n");                                                        \
} while(0)

#define LOAD_MAZE(idx) do {                                              \
    int _r, _c, _len;                                                    \
    numRows = numCols = 0;                                               \
    startPos.row = startPos.col = endPos.row = endPos.col = -1;         \
    for (_r = 0; _r < MAX_ROWS && mazeData[(idx)][_r]; _r++) {          \
        strcpy(maze[_r], mazeData[(idx)][_r]);                           \
        _len = (int)strlen(maze[_r]);                                    \
        if (_len > numCols) numCols = _len;                              \
        for (_c = 0; _c < _len; _c++) {                                  \
            if (maze[_r][_c] == START) { startPos.row=_r; startPos.col=_c; } \
            if (maze[_r][_c] == END)   { endPos.row  =_r; endPos.col  =_c; } \
        }                                                                \
        numRows++;                                                       \
    }                                                                    \
} while(0)

/* --- BFS: Shortest Path ----------------------------------- */

int bfsSolve(Point *outPath, int *outLen) {
    int visited[MAX_ROWS][MAX_COLS];
    int dr[] = {-1,1,0,0}, dc[] = {0,0,-1,1};
    int d, nr, nc, found = 0, i;
    Queue    *q = (Queue *)malloc(sizeof(Queue));
    QueueNode curr, next;

    if (!q) { printf("Memory error!\n"); return 0; }
    memset(visited, 0, sizeof(visited));
    q->front = q->rear = 0;

    /* seed with start */
    next.pos = startPos; next.path[0] = startPos; next.pathLen = 1;
    visited[startPos.row][startPos.col] = 1;
    /* enqueue inline */
    q->data[q->rear] = next; q->rear = (q->rear + 1) % MAX_QUEUE;

    while (q->front != q->rear && !found) {
        /* dequeue inline */
        curr = q->data[q->front]; q->front = (q->front + 1) % MAX_QUEUE;

        if (curr.pos.row == endPos.row && curr.pos.col == endPos.col) {
            *outLen = curr.pathLen;
            for (i = 0; i < curr.pathLen; i++) outPath[i] = curr.path[i];
            found = 1; break;
        }
        for (d = 0; d < 4; d++) {
            nr = curr.pos.row + dr[d];
            nc = curr.pos.col + dc[d];
            if (nr < 0 || nr >= numRows || nc < 0 || nc >= numCols) continue;
            if (visited[nr][nc] || maze[nr][nc] == WALL)             continue;
            visited[nr][nc] = 1;
            next = curr;
            next.pos.row = nr; next.pos.col = nc;
            next.path[next.pathLen++] = next.pos;
            /* enqueue inline */
            if ((q->rear+1) % MAX_QUEUE == q->front) { printf("  [Queue full]\n"); break; }
            q->data[q->rear] = next; q->rear = (q->rear+1) % MAX_QUEUE;
        }
    }
    free(q);
    return found;
}

/* --- DFS: All Paths --------------------------------------- */

int dfsSolveAll(void) {
    int dr[] = {-1,1,0,0}, dc[] = {0,0,-1,1};
    int d, nr, nc, i;
    Stack    *s = (Stack *)malloc(sizeof(Stack));
    StackNode curr, next;

    if (!s) { printf("Memory error!\n"); return 0; }
    totalPaths = 0;
    s->top = -1;
    memset(&next, 0, sizeof(StackNode));
    next.pos = startPos; next.path[0] = startPos; next.pathLen = 1;
    next.visited[startPos.row][startPos.col] = 1;
    /* push inline */
    s->data[++(s->top)] = next;

    while (s->top >= 0) {
        /* pop inline */
        curr = s->data[(s->top)--];

        if (curr.pos.row == endPos.row && curr.pos.col == endPos.col) {
            if (totalPaths < MAX_PATHS) {
                allPathLens[totalPaths] = curr.pathLen;
                for (i = 0; i < curr.pathLen; i++) allPaths[totalPaths][i] = curr.path[i];
                totalPaths++;
            }
            continue;
        }
        for (d = 0; d < 4; d++) {
            nr = curr.pos.row + dr[d];
            nc = curr.pos.col + dc[d];
            if (nr < 0 || nr >= numRows || nc < 0 || nc >= numCols) continue;
            if (curr.visited[nr][nc] || maze[nr][nc] == WALL)        continue;
            next = curr;
            next.pos.row = nr; next.pos.col = nc;
            next.visited[nr][nc] = 1;
            next.path[next.pathLen++] = next.pos;
            /* push inline */
            if (s->top >= MAX_STACK-1) { printf("  [Stack full]\n"); break; }
            s->data[++(s->top)] = next;
        }
    }
    free(s);
    return totalPaths;
}

/* --- Main ------------------------------------------------- */

int main(void) {
    int mazeChoice, opt, i, p;
    char ans[4];

    /* Title */
    SET_COLOR(COLOR_TITLE);
    printf("\n  +================================================+\n");
    printf("  |        VISUAL MAZE SOLVER  v1.0               |\n");
    printf("  |   Stack (DFS: All Paths) + Queue (BFS: Short) |\n");
    printf("  +================================================+\n");
    RESET_COLOR;

    /* Legend */
    printf("  Legend:  ");
    SET_COLOR(COLOR_START);   printf("S");   RESET_COLOR; printf("=Start  ");
    SET_COLOR(COLOR_END);     printf("E");   RESET_COLOR; printf("=End  ");
    SET_COLOR(COLOR_WALL);    printf("|-+"); RESET_COLOR; printf("=Wall  ");
    SET_COLOR(COLOR_PATH);    printf("*");   RESET_COLOR; printf("=Path  ");
    SET_COLOR(COLOR_VISITED); printf(".");   RESET_COLOR; printf("=Visited\n\n");

    /* ---- Maze selection ---------------------------------- */
    do {
        SET_COLOR(COLOR_TITLE);
        printf("\n  +------------------------------------------+\n");
        printf("  |           SELECT A MAZE                  |\n");
        printf("  +------------------------------------------+\n");
        RESET_COLOR;
        for (i = 0; i < NUM_MAZES; i++) printf("  [%d] %s\n", i+1, mazeTitles[i]);
        printf("  [0] Exit\n\n  Enter choice: ");

        if (scanf("%d", &opt) != 1) { while (getchar() != '\n'); opt = -1; continue; }
        if (opt == 0) goto done;
        if (opt < 1 || opt > NUM_MAZES) { printf("  Invalid choice.\n"); opt = -1; }
    } while (opt < 0);

    mazeChoice = opt - 1;
    LOAD_MAZE(mazeChoice);
    SET_COLOR(COLOR_TITLE); printf("\n  Loaded: %s\n", mazeTitles[mazeChoice]); RESET_COLOR;

    /* ---- Solve menu -------------------------------------- */
    do {
        SET_COLOR(COLOR_TITLE);
        printf("\n  +------------------------------------------+\n");
        printf("  |           SOLVE OPTIONS                  |\n");
        printf("  +------------------------------------------+\n");
        RESET_COLOR;
        printf("  [1] Show Maze Only\n");
        printf("  [2] Shortest Path  (BFS - Queue)\n");
        printf("  [3] All Paths      (DFS - Stack)\n");
        printf("  [4] Both BFS + DFS\n");
        printf("  [5] Choose a Different Maze\n");
        printf("  [0] Exit\n\n  Enter choice: ");

        if (scanf("%d", &opt) != 1) { while (getchar() != '\n'); opt = -1; continue; }

        switch (opt) {

            case 1:
                SET_COLOR(COLOR_TITLE);
                printf("\n  === MAZE: %s ===\n", mazeTitles[mazeChoice]);
                RESET_COLOR;
                printMaze(maze);
                break;

            case 2: {
                Point bfsPath[MAZE_MAX_PATH];
                int bfsLen = 0, found;
                SET_COLOR(COLOR_TITLE); printf("\n  === BFS: SHORTEST PATH ===\n"); RESET_COLOR;
                found = bfsSolve(bfsPath, &bfsLen);
                if (found) {
                    COPY_OVERLAY(bfsPath, bfsLen); printMaze(displayMaze);
                    SET_COLOR(COLOR_PATH); printf("  >> Found! %d steps\n", bfsLen-1); RESET_COLOR;
                    PRINT_STEPS(bfsPath, bfsLen);
                } else {
                    SET_COLOR(COLOR_END); printf("  >> No path exists!\n"); RESET_COLOR;
                }
                break;
            }

            case 3: {
                int count, shortIdx = 0;
                SET_COLOR(COLOR_TITLE); printf("\n  === DFS: ALL PATHS ===\n"); RESET_COLOR;
                count = dfsSolveAll();
                if (!count) { SET_COLOR(COLOR_END); printf("  >> No paths!\n"); RESET_COLOR; break; }
                for (i = 1; i < count; i++)
                    if (allPathLens[i] < allPathLens[shortIdx]) shortIdx = i;
                SET_COLOR(COLOR_START); printf("  >> Found %d path(s)!\n\n", count); RESET_COLOR;
                for (p = 0; p < count; p++) {
                    SET_COLOR(COLOR_TITLE);
                    printf("  --- Path %d (%d steps)%s ---\n",
                           p+1, allPathLens[p]-1, p==shortIdx ? "  [SHORTEST]" : "");
                    RESET_COLOR;
                    COPY_OVERLAY(allPaths[p], allPathLens[p]); printMaze(displayMaze);
                    PRINT_STEPS(allPaths[p], allPathLens[p]);
                    if (count > 1 && p < count-1) {
                        printf("  Press ENTER for next..."); while (getchar()!='\n'); getchar();
                    }
                }
                break;
            }

            case 4: {
                Point bfsPath[MAZE_MAX_PATH];
                int bfsLen = 0, found, count, shortIdx = 0;

                SET_COLOR(COLOR_TITLE); printf("\n  === BFS: SHORTEST PATH ===\n"); RESET_COLOR;
                found = bfsSolve(bfsPath, &bfsLen);
                if (found) {
                    COPY_OVERLAY(bfsPath, bfsLen); printMaze(displayMaze);
                    SET_COLOR(COLOR_PATH); printf("  >> Shortest: %d steps\n", bfsLen-1); RESET_COLOR;
                    PRINT_STEPS(bfsPath, bfsLen);
                } else {
                    SET_COLOR(COLOR_END); printf("  >> No path (BFS)\n"); RESET_COLOR;
                }

                SET_COLOR(COLOR_TITLE); printf("\n  === DFS: ALL PATHS ===\n"); RESET_COLOR;
                count = dfsSolveAll();
                if (!count) { SET_COLOR(COLOR_END); printf("  >> No paths (DFS)\n"); RESET_COLOR; break; }
                for (i = 1; i < count; i++)
                    if (allPathLens[i] < allPathLens[shortIdx]) shortIdx = i;
                SET_COLOR(COLOR_START); printf("  >> Total: %d paths\n", count); RESET_COLOR;
                printf("  Shortest via DFS: %d steps (Path #%d)\n\n  Lengths:\n",
                       allPathLens[shortIdx]-1, shortIdx+1);
                for (p = 0; p < count; p++)
                    printf("    Path %2d: %d steps%s\n",
                           p+1, allPathLens[p]-1, p==shortIdx ? "  <- Shortest" : "");

                printf("\n  Show all paths visually? (y/n): ");
                scanf("%3s", ans);
                if (ans[0]=='y' || ans[0]=='Y') {
                    for (p = 0; p < count; p++) {
                        SET_COLOR(COLOR_TITLE);
                        printf("  --- Path %d (%d steps)%s ---\n",
                               p+1, allPathLens[p]-1, p==shortIdx ? "  [SHORTEST]" : "");
                        RESET_COLOR;
                        COPY_OVERLAY(allPaths[p], allPathLens[p]); printMaze(displayMaze);
                        if (p < count-1) {
                            printf("  Press ENTER for next..."); while (getchar()!='\n'); getchar();
                        }
                    }
                }
                break;
            }

            case 5:
                do {
                    SET_COLOR(COLOR_TITLE);
                    printf("\n  +------------------------------------------+\n");
                    printf("  |           SELECT A MAZE                  |\n");
                    printf("  +------------------------------------------+\n");
                    RESET_COLOR;
                    for (i = 0; i < NUM_MAZES; i++) printf("  [%d] %s\n", i+1, mazeTitles[i]);
                    printf("  [0] Exit\n\n  Enter choice: ");

                    if (scanf("%d", &opt) != 1) { while (getchar() != '\n'); opt = -1; continue; }
                    if (opt == 0) goto done;
                    if (opt < 1 || opt > NUM_MAZES) { printf("  Invalid choice.\n"); opt = -1; }
                } while (opt < 0);

                mazeChoice = opt - 1;
                LOAD_MAZE(mazeChoice);
                SET_COLOR(COLOR_TITLE); printf("\n  Loaded: %s\n", mazeTitles[mazeChoice]); RESET_COLOR;
                opt = -1;
                break;

            case 0: break;
            default: printf("  Invalid option.\n");
        }
    } while (opt != 0);

done://to end the loop for the 1st do loop
    SET_COLOR(COLOR_TITLE);
    printf("\n  Thanks for using Maze Solver! Goodbye.\n\n");
    RESET_COLOR;
    return 0;
}
