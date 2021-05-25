window.addEventListener("load",_ => {
  const log = console.log
  const qi = (x,y=document) => y.getElementById(x)
  const q  = (x,y=document) => y.querySelector(x)
  const qq = (x,y=document) => Array.from(y.querySelectorAll(x))
  const range = x => {
    const arr = []
    for(let i=0; i<x; i++) arr.push(i)
    return arr
  }
  const randrange = n => {
    return (Math.random()*n)|0
  }
  const choice = xs => {
    return xs[randrange(xs.length)]
  }

  // const board_div = qi("tetris_board")
  // const next_div = qi("tetris_next")
  // const score_div = qi("tetris_score")

  const canvas = qi("tetris")
  const ctx = canvas.getContext("2d")

  const nrows = 20
  const ncols = 10

  const board_width = 200
  const board_height = 400
  const cell_width = board_width/ncols
  const cell_height = board_height/nrows

  const board_x = 20
  const board_y = 20

  const score_x = 250
  const score_y = 200
  const score_width = 100
  const score_height = 50

  const next_x = 250
  const next_y = 300
  const next_width = 4 * cell_width
  const next_height = 4 * cell_height

  const colours = {
    " ": "#fff",
    "A": "#f00",
    "B": "#ff0",
    "C": "#0f0",
    "D": "#0ff",
    "E": "#00f",
    "F": "#f0f",
    "G": "#777"
  }

  // board is an array of arrays of 1-char strings
  // one for each cell of the board
  let board // board without current piece
  let rendered_board // board with current piece

  let score = 0
  let is_game_over = false

  let current = {
    x: 0, y: 0, piece_index: 0, rotation: 0, next_piece_index: 0, next_rotation: 0
  }

  ////////////////////////
  // Canvas painting


  // Canvas painting functions
  const fill_board_cell = (row,col,colour_code) => {
    const x = col*cell_width + board_x
    const y = row*cell_height + board_y
    fill_cell(x,y,colour_code)
  }

  const fill_next_cell = (row,col,colour_code) => {
    const x = col*cell_width + next_x
    const y = row*cell_height + next_y
    fill_cell(x,y,colour_code)
  }

  const fill_cell = (x,y,colour_code) => {
    const colour = colours[colour_code]
    ctx.fillStyle = colour
    ctx.fillRect(x,y,cell_width,cell_height)
  }

  const clear_board = _ => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(board_x,board_y,board_width,board_height)
  }

  const clear_next = _ => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(next_x,next_y,next_width,next_height)
  }

  const paint_board_outline = _ => {
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1
    ctx.strokeRect(board_x,board_y,board_width,board_height)
  }

  const paint_next_outline = _ => {
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1
    ctx.strokeRect(next_x,next_y,next_width,next_height)
  }

  const clear_score = _ => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(score_x,score_y,score_width,score_height)
  }

  const paint_score_outline = _ => {
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1
    ctx.strokeRect(score_x,score_y,score_width,score_height)    
  }

  const paint_score = _ => {
    clear_score()
    
    ctx.font = "30px Arial"
    ctx.fillStyle = "#000"
    ctx.fillText(`${score}`, score_x+10, score_y+35)

    paint_score_outline()
  }
  

  const paint_next = _ => {
    const { next_piece_index, next_rotation } = current
    const piece_data = pieces_rotations[next_piece_index][next_rotation]
    clear_next()
    for(let row=0; row<4; row++) {
      for(let col=0; col<4; col++) {
        fill_next_cell(row,col,piece_data[row][col])
      }
    }
    paint_next_outline()
  }

  const paint_current = _ => {
    const { x: row, y: col, piece_index, rotation } = current

    paint_piece(row,col,piece_index,rotation)
  }

  const paint_piece = (row,col,piece_index,rotation) => {
    const piece_data = pieces_rotations[piece_index][rotation]
  }

  const paint_board = _ => {
    clear_board()
    for(let row=0; row<nrows; row++) {
      for(let col=0; col<ncols; col++) {
        const colour_code = rendered_board[row][col]
        fill_board_cell(row,col,colour_code)
      }
    }
    paint_board_outline()
  }

  const paint = _ => {
    render_board() // produce array of cells with frozen and current
    paint_board()
    paint_current()
    paint_next()
    paint_score()
  }


  /////////////////////////////
  // Pieces


  // a board is an array of nrows rows
  // a row is an array of ncols 1-char strings

  const create_empty_row = _ => range(ncols).map(_ => " ")
  const create_empty_board = _ => range(nrows).map(create_empty_row)
  
  // create empty piece -- convenience for creating rotations
  const create_empty_piece = _ => {
    return range(4).map(_ => range(4).map(_ => " "))
  }

  // pieces, or tetrominos
  const pieces_base = [
    ["    ","  A ","AAA ","    "],["    ","BBBB","    ","    "],
    ["    "," C  "," CCC","    "],["    ","  D "," DDD","    "],
    ["    "," EE ","  EE","    "],["    ","  FF"," FF ","    "],
    ["    "," GG "," GG ","    "]
  ]

  // each rotation of a piece
  const pieces_rotations = []

  // create rotations
  const create_rotations = _ => {
    for(let i=0; i<pieces_base.length; i++) {
      const rotations = []
      const piece = pieces_base[i].map(x => Array.from(x)) // array of 4 strings
      let rotation = piece
      for(let j=0; j<4; j++) {
        rotations.push(rotation)
        const new_rotation = create_empty_piece()
        // clockwise rotation
        for(let x=0; x<4; x++) {
          for(let y=0; y<4; y++) {
            // new rotation scans right to left, top to bottom
            // old rotation scans top to bottom, left to right
            // coordinates are [row][col], not [x][y]
            new_rotation[x][3-y] = rotation[y][x]
          }
        }
        rotation = new_rotation
      }
      pieces_rotations.push(rotations)
    }
  }
  create_rotations()

  // render a piece at coords x,y into the board. x,y can be negative provided actaul piece does not exceed board bounds
  const copy_board = source_board => {
    const new_board = create_empty_board()

    // copy board of frozen pieces
    for(let row=0; row<nrows; row++) {
      for(let col=0; col<ncols; col++) {
        new_board[row][col] = board[row][col]
      }
    }

    return new_board
  }

  // needed for when game starts and pieces have not been picked
  const render_empty_board = _ => {
    const output_board = create_empty_board()

    rendered_board = output_board
  }
  render_empty_board()

  const render_board = _ => {
    const output_board = copy_board(board)

    // copy current piece
    const { x, y, piece_index, rotation } = current
    const piece_data = pieces_rotations[piece_index][rotation]

    for(let piece_row=0; piece_row<4; piece_row++) { // i == y coord in piece
      for(let piece_col=0; piece_col<4; piece_col++) { // j == x coord in piece
        let output_col = piece_col+x, output_row = piece_row+y
        // check bounds
        if( output_col >= 0 && output_col < ncols ) {
          if( output_row >= 0 && output_row < nrows ) {
            // copy data within bounds
            const square = piece_data[piece_row][piece_col]
            if( square != " " ) output_board[output_row][output_col] = square
          }
        }
      }
    }

    rendered_board = output_board
  }
  
  ///////////////////////////
  // Game logic

  const can_move_to = (x, y, piece_index, rotation) => {
    if( check_bounds(x, y, piece_index, rotation)) {
      if( !would_collide(x, y, piece_index, rotation) ) {
        return true
      }
    }
    return false
  }

  const check_bounds = (x, y, piece_index, rotation) => {
    if( !check_bounds_down(x, y, piece_index, rotation) ) return false
    if( !check_bounds_left(x, y, piece_index, rotation) ) return false
    if( !check_bounds_right(x, y, piece_index, rotation) ) return false
    return true
  }

  // see if moving piece to (x,y) would cause collision with existing board
  const would_collide = (x,y,piece_index,rotation) => {
    const piece_data = pieces_rotations[piece_index][rotation]

    for(let row=0; row<4; row++) {
      for(let col=0; col<4; col++) {
        let square = piece_data[row][col]
        if( square != " " ) {
          const test_row = y+row, test_col = x+col
          if( test_row < nrows && test_col < ncols && test_col >= 0 && test_row >= 0 ) {
            if( board[test_row][test_col] != " " ) {
              return true
            }
          }
        }
      }
    }
    return false
  }

  // see if moving down would move piece off board
  const check_bounds_down = (x, y, piece_index, rotation) => {
    const piece_data = pieces_rotations[piece_index][rotation]

    const number_of_rows_to_check = y + 4 - nrows
    if( number_of_rows_to_check < 0 ) return true
    for(let z=0; z < number_of_rows_to_check; z++ ) {
      const row = 3-z
      for(let col=0; col<4; col++) {
        if( piece_data[row][col] != " " ) return false
      }
    }
    return true
  }

  // see if moving left would move piece off board
  const check_bounds_left = (x, y, piece_index, rotation) => {
    const piece_data = pieces_rotations[piece_index][rotation]
    
    if( x >= 0 ) return true

    // number of columns off left side of board
    // if current.x == 0 -- check 1
    // if current.x == -1 -- check 2
    // if current.x == -2 -- check 3
    // so number to check == 1 - current.x
    const number_of_columns_to_check = - x
    for(let col=0; col<number_of_columns_to_check; col++) {
      for(let row=0; row<4; row++) {
        if( piece_data[row][col] != " " ) return false
      }
    }
    return true
  }

  // see if moving right would move piece off board
  const check_bounds_right = (x, y, piece_index, rotation) => {
    const piece_data = pieces_rotations[piece_index][rotation]
    
    const try_x = x + 1

    if( try_x + 4 < ncols ) return true;
    const number_of_columns_to_check = try_x + 3 - ncols
    for(let i=0; i<number_of_columns_to_check; i++) { // i is column index from right
      const col = 3-i // col is column index from left
      for(let row=0; row<4; row++) {
        if( piece_data[row][col] != " " ) return false
      }
    }
    return true
  }

  ///////////////////////
  // Keyboard handler

  const pd = e => e.preventDefault()

  const handle_key = e => {
    const { x, y, piece_index, rotation } = current
    const key = e.key
    if( key == "ArrowLeft" ) {
      pd(e)
      if( can_move_to(x - 1, y, piece_index, rotation ) ) {
        current.x -= 1;
      }
    } else if( key == "ArrowRight" ) {
      pd(e)
      if( can_move_to(x + 1, y, piece_index, rotation ) ) {
        current.x += 1
      }
    } else if( key == "ArrowUp" ) {
      pd(e)
      if( can_move_to(x, y, piece_index, (rotation + 1) % 4) ) {
        current.rotation = (rotation + 1) % 4
      }
    } else if( key == "ArrowDown" ) {
      pd(e)
      if( can_move_to(x, y + 1, piece_index, rotation) ) {
        current.y += 1
      }
    } else if( key == "q" ) {
      pd(e)
      if( is_game_over ) {
        start_game()
      } else {
        game_over()
      }
    }
    paint()
  }

  /////////////////////////
  // Start game


  const start_game = _ => {
    score = 0
    is_game_over = false

    // clear the board
    board = create_empty_board()

    // choose next piece
    current.next_piece_index = randrange(pieces_rotations.length)
    // choose next rotation
    current.next_rotation = randrange(4)

    render_empty_board()
    next_piece()
    update_score()

    paint()
    set_next_tick()
  }

  const next_piece = _ => {
    current.piece_index = current.next_piece_index
    current.rotation = current.next_rotation
    current.x = ((ncols - 4)/2) | 0
    current.y = 0 // tick moves down to begin with
    current.next_piece_index = randrange(pieces_rotations.length)
    current.next_rotation = randrange(4)

    const { x, y, piece_index, rotation } = current
    const { next_piece_index, next_rotation } = current
    const current_piece_data = pieces_rotations[piece_index][rotation]

    // move next piece flush to top
    for(let row=0; row<4; row++) {
      let empty_row = true
      for(let col=0; col<4; col++) {
        if( current_piece_data[row][col] != " ") {
          empty_row = false
          break
        }
      }
      if( empty_row ) {
        current.y -= 1
      } else {
        break
      }
    }

    if( would_collide(x, y, piece_index, rotation ) ) {
      game_over()
    }
  }

  const game_over = _ => {
    is_game_over = true
    if( tick_timeout ) clearTimeout(tick_timeout)
    log("Game over")
  }

  const freeze_piece = (x, y, piece_index, rotation )=> {
    const piece_data = pieces_rotations[piece_index][rotation]
    // copy current board to new_board
    const new_board = copy_board(board)
    // copy current piece to new_board
    for(let piece_row=0; piece_row<4; piece_row++) {
      for(let piece_col=0; piece_col<4; piece_col++) {
        const square = piece_data[piece_row][piece_col]
        if( square != " " ) {
          new_board[y+piece_row][x+piece_col] = square
        }
      }
    }
    // assign new_board to board
    board = new_board
  }

  const check_for_completed_lines = _ => {
    let completed_lines = 0
    for(let row=0; row < nrows; row++) {
      let completed = true
      for(let col=0; col < ncols; col++) {
        if( board[row][col] == " " ) {
          completed = false
        }
      }
      if( completed ) {
        score += 1
        // copy lines from row to top
        for(let row2=row; row2 > 0; row2--) {
          for(let col=0; col<ncols; col++) {
            board[row2][col] = board[row2-1][col]
          }
        }
        for(let col=0; col<ncols; col++) {
          board[0][col] = " "
        }
      }
    }
    return true
  }

  let tick_time = 1000
  let tick_timeout = null

  const clear_tick = _ => {
    if( tick_timeout ) clearTimeout(tick_timeout)
  }
  const set_next_tick = _ => {
    tick_timeout = setTimeout(tick,tick_time)
  }

  const update_score = _ => {
  }

  const tick = _ => {
    const { x, y, piece_index, rotation } = current
    clear_tick()
    if( is_game_over ) return
    if( can_move_to(x, y + 1, piece_index, rotation) ) {
      current.y += 1
    } else {
      freeze_piece(x, y, piece_index, rotation)
      check_for_completed_lines()
      next_piece()
    }
    paint()
    update_score()
    set_next_tick()
  }

  window.addEventListener("keydown", handle_key)
  

  start_game()
})