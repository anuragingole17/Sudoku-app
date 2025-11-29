/* Simple Sudoku generator + solver (backtracking) and UI glue */

const boardEl = document.getElementById('board');
const generateBtn = document.getElementById('generateBtn');
const solveBtn = document.getElementById('solveBtn');
const clearBtn = document.getElementById('clearBtn');
const validateBtn = document.getElementById('validateBtn');
const levelSel = document.getElementById('level');

let puzzle = []; // 9x9 with 0 empty
let fixed = []; // same shape: true if fixed (given)

// Utilities
function deepCopy(grid){ return grid.map(r => r.slice()); }
function idx(r,c){ return r*9 + c; }

// Create empty board in DOM
function createBoardDOM(){
  boardEl.innerHTML = '';
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.tabIndex = 0;
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click', () => cell.focus());
      cell.addEventListener('keydown', handleKey);
      boardEl.appendChild(cell);
    }
  }
  render();
}

function render(){
  const cells = boardEl.children;
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const v = puzzle[r][c];
      const cell = cells[idx(r,c)];
      cell.textContent = v === 0 ? '' : String(v);
      cell.classList.toggle('fixed', fixed[r][c]);
      cell.classList.remove('invalid');
    }
  }
}

// Key handling for input
function handleKey(e){
  const r = +this.dataset.r, c = +this.dataset.c;
  if(e.key >= '1' && e.key <= '9'){
    const val = Number(e.key);
    if(!fixed[r][c]){
      puzzle[r][c] = val;
      render();
    }
    e.preventDefault();
  } else if(e.key === 'Backspace' || e.key === 'Delete' || e.key === '0'){
    if(!fixed[r][c]){
      puzzle[r][c] = 0;
      render();
    }
    e.preventDefault();
  } else if(e.key === 'ArrowLeft'){ focusCell(r, c-1); e.preventDefault(); }
  else if(e.key === 'ArrowRight'){ focusCell(r, c+1); e.preventDefault(); }
  else if(e.key === 'ArrowUp'){ focusCell(r-1, c); e.preventDefault(); }
  else if(e.key === 'ArrowDown'){ focusCell(r+1, c); e.preventDefault(); }
}

function focusCell(r,c){
  if(r<0 || r>8 || c<0 || c>8) return;
  const el = boardEl.children[idx(r,c)];
  el.focus();
}

// Sudoku solver (backtracking) - returns solved grid or null
function solveSudoku(grid){
  const g = deepCopy(grid);
  function isValid(g, r, c, val){
    for(let i=0;i<9;i++){
      if(g[r][i] === val) return false;
      if(g[i][c] === val) return false;
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let i=0;i<3;i++) for(let j=0;j<3;j++){
      if(g[br+i][bc+j] === val) return false;
    }
    return true;
  }
  function findEmpty(g){
    for(let i=0;i<9;i++) for(let j=0;j<9;j++) if(g[i][j] === 0) return [i,j];
    return null;
  }
  function backtrack(){
    const pos = findEmpty(g);
    if(!pos) return true;
    const [r,c] = pos;
    for(let num=1;num<=9;num++){
      if(isValid(g,r,c,num)){
        g[r][c] = num;
        if(backtrack()) return true;
        g[r][c] = 0;
      }
    }
    return false;
  }
  if(backtrack()) return g;
  return null;
}

// Generator: produce a full valid board via backtracking and then remove cells
function generateFullBoard(){
  // start with zeros and fill by backtracking with random order
  const g = Array.from({length:9},()=>Array(9).fill(0));
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
  function canPlace(g, r, c, val){
    for(let i=0;i<9;i++){ if(g[r][i]===val || g[i][c]===val) return false; }
    const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
    for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(g[br+i][bc+j]===val) return false;
    return true;
  }
  function fill(){
    for(let i=0;i<81;i++){
      const r = Math.floor(i/9), c = i%9;
      if(g[r][c] === 0){
        let nums = [1,2,3,4,5,6,7,8,9];
        shuffle(nums);
        for(const n of nums){
          if(canPlace(g,r,c,n)){
            g[r][c]=n;
            if(fill()) return true;
            g[r][c]=0;
          }
        }
        return false;
      }
    }
    return true;
  }
  fill();
  return g;
}

function countSolutions(grid, limit=2){
  // backtracking but stop after limit solutions found
  let found = 0;
  const g = deepCopy(grid);
  function isValid(g,r,c,val){
    for(let i=0;i<9;i++){ if(g[r][i]===val || g[i][c]===val) return false; }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(g[br+i][bc+j]===val) return false;
    return true;
  }
  function findEmpty(g){
    for(let i=0;i<9;i++) for(let j=0;j<9;j++) if(g[i][j] === 0) return [i,j];
    return null;
  }
  function backtrack(){
    if(found >= limit) return;
    const pos = findEmpty(g);
    if(!pos){ found++; return; }
    const [r,c] = pos;
    for(let n=1;n<=9 && found < limit;n++){
      if(isValid(g,r,c,n)){
        g[r][c]=n;
        backtrack();
        g[r][c]=0;
      }
    }
  }
  backtrack();
  return found;
}

// Remove numbers from full board to create puzzle; ensure unique solution (basic)
function makePuzzle(full, removals){
  const puzzle = deepCopy(full);
  const positions = Array.from({length:81}, (_,i)=>i);
  // random removal order
  for(let i=positions.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  let removed = 0;
  for(const p of positions){
    if(removed >= removals) break;
    const r = Math.floor(p/9), c = p%9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // check uniqueness quickly: count solutions up to 2
    const solCount = countSolutions(puzzle, 2);
    if(solCount !== 1){
      // revert if not unique
      puzzle[r][c] = backup;
    } else {
      removed++;
    }
  }
  return puzzle;
}

// API: generate puzzle based on difficulty (removals)
function generatePuzzle(removals){
  const full = generateFullBoard();
  // removals: number of cells to remove (i.e., 81 - filled)
  return { full, puzzle: makePuzzle(full, removals) };
}

// UI interactions
generateBtn.addEventListener('click', () => {
  const removals = Number(levelSel.value);
  const { full, puzzle: p } = generatePuzzle(removals);
  puzzle = p;
  fixed = puzzle.map(r => r.map(v => v !== 0));
  // ensure puzzle is 9x9
  render();
});

solveBtn.addEventListener('click', () => {
  const solved = solveSudoku(puzzle);
  if(!solved){
    alert('No solution found (board may be invalid).');
    return;
  }
  puzzle = solved;
  // mark all as non-fixed so they highlight as filled (keep original fixed true)
  render();
});

clearBtn.addEventListener('click', () => {
  puzzle = Array.from({length:9},()=>Array(9).fill(0));
  fixed = Array.from({length:9},()=>Array(9).fill(false));
  render();
});

validateBtn.addEventListener('click', () => {
  const invalids = [];
  for(let r=0;r<9;r++) for(let c=0;c<9;c++){
    const v = puzzle[r][c];
    if(v === 0) continue;
    // temporarily remove and check duplicates
    puzzle[r][c] = 0;
    const valid = (function(){
      for(let i=0;i<9;i++) if(puzzle[r][i] === v) return false;
      for(let i=0;i<9;i++) if(puzzle[i][c] === v) return false;
      const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(puzzle[br+i][bc+j] === v) return false;
      return true;
    })();
    puzzle[r][c] = v;
    if(!valid) invalids.push([r,c]);
  }
  // mark invalids
  const cells = boardEl.children;
  for(const [r,c] of invalids){
    cells[idx(r,c)].classList.add('invalid');
  }
  if(invalids.length === 0) alert('Board is valid (no duplicates detected).');
  else alert(`Found ${invalids.length} invalid cells (duplicates).`);
});

createBoardDOM();

// initialize empty grid
puzzle = Array.from({length:9},()=>Array(9).fill(0));
fixed = Array.from({length:9},()=>Array(9).fill(false));
render();
