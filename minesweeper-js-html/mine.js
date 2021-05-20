const mine_main = _ => {  
  // common convenience shorthands I use regularly
  const log = console.log
  const qi = (x,y=document) => y.getElementById(x)
  const q = (x,y=document) => y.querySelector(x)
  const qq = (x,y=document) => Array.from(y.querySelectorAll(x))
  const ce = (x,y=document) => y.createElement(x)

  let nrows, ncos, ncells, nmines
  let mineloc, adj, flags, covered, divs // initialised in init_arrays()
  let gamestate // either "init", "running", "victory", or "gameover"
  let cheated

  // colours of the numbers, following those in Winmine.exe
  const number_colours = [
    "black",
    "blue",
    "green",
    "red",
    "purple",
    "maroon",
    "turquiose",
    "black",
    "#777"
  ]

  // convenience functions to access game state
  const coords_to_index = (x,y) => x + y * ncols
  const index_to_coords = (i) => [i % ncols, (i / ncols) | 0]
  const isFlag = (x,y) => flags[coords_to_index(x,y)]
  const setFlag = (x,y,f) => flags[coords_to_index(x,y)] = f
  const isMine = (x,y) => mineloc[coords_to_index(x,y)]
  const isCovered = (x,y) => covered[coords_to_index(x,y)]
  const getAdj = (x,y) => adj[coords_to_index(x,y)]

  // more convenience functions
  const n_times = (l,f) => { for(let i=0; i<l; i++) f(i) }
  const shuffle = (a) => { a.sort(_ => Math.random()-0.5 ) }

  // initialise the arrays
  const init_data = (r=8,c=8,m=10) => {
    cheated = false

    nrows = r
    ncols = c
    ncells = nrows * ncols
    nmines = m

    gamestate = "init" 

    mineloc = new Array(ncells)
    adj = new Array(ncells)
    flags = new Array(ncells)
    covered = new Array(ncells)
    divs = new Array(ncells)
    
    n_times(ncells,i => {
      flags[i] = false
      covered[i] = true
      mineloc[i] = i < nmines
    })
    shuffle(mineloc)
  }

  // compute mine adjacency numbers
  const calculate_adj = _ => {
    for(i=0; i<adj.length; i++) {
      const [ x, y ] = index_to_coords(i)      

      const isLeft = x == 0, isRight = x == ncols - 1
      const isTop = y == 0, isBottom = y == nrows - 1

      let nadj = 0
      if( ! isLeft   && ! isTop    ) if( mineloc[coords_to_index(x-1,y-1)] ) nadj++
      if( ! isLeft                 ) if( mineloc[coords_to_index(x-1,y  )] ) nadj++
      if( ! isLeft   && ! isBottom ) if( mineloc[coords_to_index(x-1,y+1)] ) nadj++
      if(               ! isTop    ) if( mineloc[coords_to_index(x  ,y-1)] ) nadj++
      if(               ! isBottom ) if( mineloc[coords_to_index(x  ,y+1)] ) nadj++
      if( ! isRight  && ! isTop    ) if( mineloc[coords_to_index(x+1,y-1)] ) nadj++
      if( ! isRight                ) if( mineloc[coords_to_index(x+1,y  )] ) nadj++
      if( ! isRight  && ! isBottom ) if( mineloc[coords_to_index(x+1,y+1)] ) nadj++

      if( mineloc[i] ) adj[i] = "M"
      else             adj[i] = nadj
    }    
  }

  // create DOM elements and insert them into the document
  const make_divs = _ => {
    const board = qi("board")

    for(let y=0; y<nrows; y++) {
      const rowdiv = ce("div")
      rowdiv.classList.add("row")
      for(let x=0; x<ncols; x++) {
        const div = ce("div")
        div.classList.add("cell")
        div.x = x
        div.y = y
        update_div_style(div)

        div.innerHTML = "&nbsp;"
        div.setAttribute("unseledtable","on")

        rowdiv.append(div)
        divs[coords_to_index(x,y)] = div

        div.addEventListener("click",e => {
          e.preventDefault()
          const div = e.target
          if( e.shiftKey ) {
            toggle_flag(div)
          } else {
            try_cell(div)
          }
        })
      }
      board.append(rowdiv)
    }
  }

  const update_all_div_style = _ => {
    divs.forEach(update_div_style)
  }

  const update_div_style = div => {
    const x = div.x, y = div.y
    if( isFlag(x,y) ) {
      if( gamestate == "gameover" ) {
        if( isMine(x,y) ) {
          div.style.backgroundColor = "#0a0"
        } else {
          div.style.backgroundColor = "#c70"
        }
      } else {
        div.style.backgroundColor = "#ccc"
      }
    } else if( isCovered(x,y) ) {
      div.style.backgroundColor = "#777"
      if( cheated ) {
        if( isMine(x,y) ) {
          div.innerText = "M"
        } else {
          if( gamestate != "init" ) {
            div.innerText = `${getAdj(x,y)}`
          } else {
            div.innerHTML = `&nbsp;`
          }
        }
      }
    } else if( isMine(x,y) ) {
      div.style.backgroundColor = "red"
    } else {
      div.style.backgroundColor = "white"
      div.style.color = number_colours[getAdj(x,y)]
    }
  }

  const toggle_flag = div => {
    const x = div.x, y = div.y
    if( ! isCovered(x,y) ) { return }
    setFlag(x,y,!isFlag(x,y))
    if( isFlag(x,y) ) { div.innerText = "F" }
    else { div.innerHTML = "&nbsp;" }
    update_div_style(div)
  }
  
  const gameover = _ => {
    gamestate = "gameover"
    divs.forEach(uncover_div)
    update_status()
  }

  const uncover_div = div => {
    const x = div.x, y = div.y
    let a
    covered[coords_to_index(x,y)] = false
    if( isMine(x,y) ) { div.innerText = "M" }
    if( (a = getAdj(x,y)) > 0 ) { div.innerText = `${a}` }
    update_div_style(div)
  }

  const test_victory = _ => {
    let n_uncovered = 0
    divs.forEach(div => {
      const x = div.x, y = div.y
      if( ! isCovered(x,y) ) n_uncovered++
    })
    if(n_uncovered + nmines == ncells) {
      gamestate = "victory"
      update_status()
    }
  }

  const update_status = _ => {
    const status = qi("status")
    let n_uncovered = 0
    let total_to_uncover = ncells - nmines
    divs.forEach(div => {
      const x = div.x, y = div.y
      if( ! isCovered(x,y) ) n_uncovered++
    })
    switch( gamestate ) {
      case "init":
          status.innerText = "Welcome"
          break;
        case "gameover":
          status.innerText = "Game Over"
          break;
        case "running":
          status.innerText = `Careful ${n_uncovered}/${total_to_uncover}`
          break;
        case "victory":
          if( cheated ) {
            status.innerText = "You cheated!"
          } else {
            status.innerText = "Victory"
          }
          break;
    }
  }

  const try_cell = div => {
    const x = div.x, y = div.y

    const isLeft = x == 0, isRight = x == ncols - 1
    const isTop = y == 0, isBottom = y == nrows - 1

    if( gamestate == "victory" || gamestate == "gameover" ) { return }
    if( gamestate == "init" ) { 
      // an important feature of winmine.exe is that you can't
      // hit a mine on your first attempt -- the first square you
      // click is _never_ a mine. To do this we delay calculating
      // adjacency until _after_ the user has clicked a square,
      // but _before_ the contents of the square is revealed.
      // To do this, we find the first non-mine square in the array
      // and slide it along so that it coincides with the user's
      // first selected square.

      // find an index of a non-mine square
      let i
      for(i=0; mineloc[i]; i++);
      // we are guaranteed that mineloc[i] == false

      // get index into the array of the square the user clicked      
      const j = coords_to_index(x,y)
      // we want to slide so that mineloc[j] moves to mineloc[i]
      // so left by j, then right by i
      
      // calculate where to slice the array
      // if i == j, we slide by zero, and if i and j differ by 1,
      // we slide by 1. Thus d = i - j, but wrapped using modulus.
      // We can check this empirically using a test array and
      // trying both d = i - j and d = j - i, and see that
      // splicing as we do, d = i - j (mod n) is correct.
      // Now to ensure that d is non-negative, we add n before
      // taking the modulus (if x < 0 then x % n < 0 too in Javascript)
      const d = ((ncells+i-j)%ncells)
      
      // slide the array along
      // the first slice lops off the right part
      // the second slice takes the left part,
      // and we concat the left part after the right.
      mineloc = mineloc.slice(d).concat(mineloc.slice(0,d))
      
      // calculate adjacency now that mine positions are fixed.
      calculate_adj() 

      gamestate = "running"
      if( cheated ) update_all_div_style()
    }
    //gamestate = "running"
    if( isFlag(x,y) ) { return }
    if( isMine(x,y) ) { return gameover() }
    if( ! isCovered(x,y) ) { return }
    uncover_div(div)    
    const adj = getAdj(x,y)
    if( adj == 0 ) {
      if( ! isLeft   && ! isTop    ) try_cell(divs[coords_to_index(x-1,y-1)])
      if( ! isLeft                 ) try_cell(divs[coords_to_index(x-1,y  )])
      if( ! isLeft   && ! isBottom ) try_cell(divs[coords_to_index(x-1,y+1)]) 
      if(               ! isTop    ) try_cell(divs[coords_to_index(x  ,y-1)]) 
      if(               ! isBottom ) try_cell(divs[coords_to_index(x  ,y+1)]) 
      if( ! isRight  && ! isTop    ) try_cell(divs[coords_to_index(x+1,y-1)]) 
      if( ! isRight                ) try_cell(divs[coords_to_index(x+1,y  )]) 
      if( ! isRight  && ! isBottom ) try_cell(divs[coords_to_index(x+1,y+1)]) 
    }

    test_victory()
    update_status()
  }

  const empty_board = _ => {
    qi("board").innerHTML = ""
  }

  const restart = _ => {    
    const r = parseInt(qi("input_rows").value)
    const c = parseInt(qi("input_cols").value)
    const m = parseInt(qi("input_mines").value)
    const errors = []
    if( r < 5 ) errors.push("Too few rows.")
    if( c < 5 ) errors.push("Too few columns")
    if( m > (r * c - 10) ) errors.push("Too many mines")
    if( m < 5 ) errors.push("Too few mines")
    if( errors.length > 0 ) {
      qi("error").innerText = errors.join(" ")
    } else {
      cheated = false
      init_data(r,c,m)
      empty_board()
      make_divs()
      update_status()
      divs.forEach(update_div_style)
    }
  }

  const main = _ => {
    qi("restart_button").addEventListener("click",e => {
      e.preventDefault()
      restart()
    })
    qi("cheat_button").addEventListener("click",e => {
      e.preventDefault()
      cheated = true
      if( gamestate != "init" ) {
        update_all_div_style()
      }
    })
    restart()
  }

  main()
}
window.addEventListener("load",mine_main)
