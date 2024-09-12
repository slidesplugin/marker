// import debugListener from "./debug_listener.mjs"

const ID = "slides-plugin-marker"

export default {
  init: () => (() => ({
    id: ID,
    init: () => {
      initMarker()
    }
  }))
}

function *genFlowID(start=0) {
  for (let start=0;;start++) {
    yield start
  }
}
const getFlowID = genFlowID(0)

function initMarker() {
  // debugListener()
  let isMarking = false
  let canvas, ctx
  let toolbar
  let currentColor = '#000'
  let isErasing = false
  let drawingHistory = {} // 保存每一頁投影片的畫圖結果

  // 紀錄toolBar的位置
  let toolbarTop = 10
  let toolbarLeft = 10

  let savedEraserSize = localStorage.getItem('slides.eraserSize') ?? 10

  // let backgroundImage; // 使橡皮擦擦去的地方，是進入標記模式時最初的背景顏色
  // let originalUserSelect // 將圖層拉到上面，就選不到了，不需要特別調整userSelect

  function createCanvas() {
    document.querySelector(`canvas#${ID}`)?.remove() // 確保舊的內容可以被刪除
    canvas = document.createElement('canvas')
    canvas.id = ID
    canvas.style.position = 'absolute'
    canvas.style.top = "0"
    canvas.style.left = "0"
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)

    ctx = canvas.getContext('2d')
    ctx.strokeStyle = currentColor
    ctx.lineWidth = 5

    // 使線條更加平滑
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseout', stopDrawing)

    // 讓backgroundImage的內容，為一開始都還沒有被編輯過的canvas
    // 這有一個問題，根本無從得知一開始的圖像，因為這是一張空白的圖像，除非用html2canvas把一開始進入的內容變成圖像
    // backgroundImage = new Image()
    // backgroundImage.src = canvas.toDataURL()

    // originalUserSelect = document.body.style.userSelect
  }

  function startDrawing(e) {
    ctx.beginPath()
    ctx.moveTo(e.clientX, e.clientY)
    canvas.isDrawing = true
  }

  function draw(e) {
    if (!isMarking || !canvas.isDrawing) {
      return
    }
    if (isErasing) {
      // Use the background image to restore the original content
      // ctx.drawImage(backgroundImage, x, y, 30, 30, x, y, 30, 30); // Erase with the original background 這種方法需要原圖像才能

      // 使用globalCompositeOperation可以不需要原圖像也能復原!
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      const x = e.clientX
      const y = e.clientY
      ctx.arc(x, y, savedEraserSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = "source-over"
    } else {
      // is draw mode
      ctx.lineTo(e.clientX, e.clientY)
      ctx.stroke()
    }
  }

  function stopDrawing() {
    canvas.isDrawing = false
    saveDrawing()
  }

  function createToolbar() {
    toolbar = document.createElement('div')
    toolbar.style.position = 'absolute'
    toolbar.style.top = `${toolbarTop}px`
    toolbar.style.left = `${toolbarLeft}px`
    toolbar.style.backgroundColor = '#fff'
    toolbar.style.border = '1px solid #ccc'
    toolbar.style.padding = '10px'
    // const sessionID = getFlowID.next().value

    const minEraserSize = 5
    const maxEraserSize = 100

    // 讀取本地存儲來設定toolbar的尺寸
    const savedWidth = localStorage.getItem('slides.toolbarWidth')
    const savedHeight = localStorage.getItem('slides.toolbarHeight')
    if (savedWidth && savedHeight) {
      toolbar.style.width = savedWidth
      toolbar.style.height = savedHeight
    } else {
      toolbar.style.width = '90px' // 使用比較窄一點,讓solid旁邊就放highlight顏色
    }
    // 監控大小變化，並將其保存到本地存儲
    toolbar.addEventListener('mouseup', () => {
      localStorage.setItem('slides.toolbarWidth', toolbar.style.width)
      localStorage.setItem('slides.toolbarHeight', toolbar.style.height)
    })

    toolbar.style.resize = 'both' // 讓工具列可以調整大小 // 這個會與mousemove相衝
    // toolbar.style.cursor = 'move' // 改用header來拖動
    toolbar.style.overflow = 'auto' // 防止內容超出邊界

    const toolbarHeader = document.createElement('div')
    toolbar.append(toolbarHeader) // 把header加到工具列
    toolbarHeader.style.cursor = 'move' // 只允許從header拖動
    toolbarHeader.style.backgroundColor = '#ddd'
    toolbarHeader.style.padding = '5px'

    // 將x放到右邊去
    toolbarHeader.style.display = "flex"
    toolbarHeader.style.justifyContent = "space-between"

    toolbarHeader.innerText = '✍️'

    let offsetX, offsetY, isDragging = false

    toolbarHeader.addEventListener('mousedown', (e) => {
      isDragging = true
      offsetX = e.clientX - toolbar.offsetLeft
      offsetY = e.clientY - toolbar.offsetTop
      toolbar.style.cursor = 'grabbing'
    })

    document.addEventListener('mousemove', (e) => {
      // console.log(sessionID)

      if (isDragging) {
        const left = e.clientX - offsetX
        const top = e.clientY - offsetY
        toolbar.style.left = `${left}px`
        toolbar.style.top = `${top}px`

        // 使得下一次開啟還能把toolbar放到之前的位子
        toolbarLeft = left
        toolbarTop = top
      }
    })

    document.addEventListener('mouseup', () => {
      isDragging = false
      toolbar.style.cursor = 'move'
    })

    // 函數：創建顏色按鈕
    function createColorButton(color, alpha = 1.0) {
      const colorButton = document.createElement('button')
      colorButton.style.backgroundColor = color
      colorButton.style.width = '30px'
      colorButton.style.height = '30px'
      colorButton.style.margin = '5px'
      colorButton.addEventListener('click', () => {
        currentColor = color
        ctx.strokeStyle = color
        ctx.globalAlpha = alpha
        isErasing = false

        // 如果是螢光筆，增加筆劃寬度
        if (alpha<1) {
          ctx.lineWidth = 25 // 螢光筆較粗
        } else {
          ctx.lineWidth = 5 // 普通筆劃
        }
      })
      toolbar.append(colorButton)
    }

    // colors: solid, highlight
    const colors = [
      ['#000', 1], ['rgba(0, 0, 0, 0.1)',0.1],
      ['#ffff00',1], ['rgba(255, 255, 0, 0.2)', 0.2], // 黃色比較不明顯要比較深
      ['#f00',1],['rgba(255, 0, 0, 0.1)',0.1],
      ['#0f0',1],['rgba(0, 255, 0, 0.1)',0.1],
      ['#00f',1],['rgb(187,239,255)',0.1],
    ]
    colors.forEach(([color,alpha]) => createColorButton(color, alpha))

    const eraserButton = document.createElement('button')
    eraserButton.innerHTML = '🗞️'
    eraserButton.addEventListener('click', () => {
      isErasing = true
    })
    toolbar.append(eraserButton)

    document.addEventListener('wheel', (e) => {
      if (e.shiftKey && isErasing) { // 確保按下 Shift 並且處於橡皮擦模式
        if (e.deltaY < 0) {
          savedEraserSize = Math.min(maxEraserSize, savedEraserSize + 5) // 增大橡皮擦
        } else {
          savedEraserSize = Math.max(minEraserSize, savedEraserSize - 5) // 減小橡皮擦
        }
        localStorage.setItem('slides.eraserSize',  savedEraserSize)
      }
    })

    const exitButton = document.createElement('button')
    exitButton.innerHTML = 'x'
    exitButton.style.right = "0"
    exitButton.style.color = 'red'
    exitButton.addEventListener('click', exitMarkingMode)
    toolbarHeader.append(exitButton)

    document.body.appendChild(toolbar)
  }

  function enterMarkingMode() {
    if (!isMarking) {
      if (globalThis.Reveal) {
        const id = getCurSlideID()
        if (id && drawingHistory[id]) {
          // 用之前畫過的canvas來取代
          restoreDrawing()
        } else {
          createCanvas()
        }
      } else if (!canvas){
        createCanvas()
      }

      if (!toolbar) {
        // 僅當toolbar不存在的時候才要新增，避免eventListener重複加
        createToolbar()
      }
      toolbar.style.display = ""

      canvas.style.zIndex = "100" // 讓canvas畫出來的內容能保持在最上層
      toolbar.style.zIndex = "101" // toolbar的zIndex需大於canvas，否則會選不到

      // document.body.style.userSelect = 'none' // 選取模式會影響畫圖，所以進入標記模式時，要先關閉

      isMarking = true
    }
  }

  function exitMarkingMode() {
    if (isMarking) {
      canvas.style.zIndex = -1000 // 讓其沒辦法被選到
      if (globalThis.Reveal) {
        delete drawingHistory[Reveal.getCurrentSlide().id]
      }
      // document.body.removeChild(toolbar) // 避免重複創建toolbar
      toolbar.style.display = "none"

      isMarking = false
      // document.body.style.userSelect = originalUserSelect
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (globalThis.Reveal) {
      delete drawingHistory[Reveal.getCurrentSlide().id]
    }
    saveDrawing()
  }

  function getCurSlideID() {
    if (!globalThis.Reveal) {
      return undefined
    }
    const {h, v, f} = Reveal.getIndices() // h, v, f
    return `${h}.${v}.${f??""}`
  }

  function saveDrawing() {
    const id = getCurSlideID()
    if (id) {
      drawingHistory[id] = canvas.toDataURL()
    }
  }

  function restoreDrawing() {
    const id = getCurSlideID()
    if (!id) {
      return
    }
    if (drawingHistory[id]) {
      // 表示之前已經有內容存在
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
      }
      img.src = drawingHistory[id]
    } else {
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm') {
      // toggle
      isMarking? exitMarkingMode() : enterMarkingMode()
    } else if (e.altKey && e.key.toLowerCase() === 'c') {
      clearCanvas()
    }
  })

  if (globalThis.Reveal) {
    Reveal.addEventListener('slidechanged', restoreDrawing)
  }
}
