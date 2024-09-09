export default {
  init: () => (()=>({
    id: "marker",
    init: () => {
      initMarker()
    }
  }))
}

function initMarker() {
  let isMarking = false
  let canvas, ctx
  let toolbar
  let currentColor = '#000'
  let isErasing = false
  // let backgroundImage; // 使橡皮擦擦去的地方，是進入標記模式時最初的背景顏色
  // let originalUserSelect // 將圖層拉到上面，就選不到了，不需要特別調整userSelect

  function createCanvas() {
    canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = "0"
    canvas.style.left = "0"
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)

    ctx = canvas.getContext('2d')
    ctx.strokeStyle = currentColor
    ctx.lineWidth = 5

    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)

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
    if (!canvas.isDrawing) {
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
      ctx.arc(x, y, 10, 0, Math.PI * 2)
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
  }

  function createToolbar() {
    toolbar = document.createElement('div')
    toolbar.style.position = 'absolute'
    toolbar.style.top = '10px'
    toolbar.style.left = '10px'
    toolbar.style.backgroundColor = '#fff'
    toolbar.style.border = '1px solid #ccc'
    toolbar.style.padding = '10px'

    const colors = ['#000', '#f00', '#0f0', '#00f']
    colors.forEach(color => {
      const colorButton = document.createElement('button')
      colorButton.style.backgroundColor = color
      colorButton.style.width = '30px'
      colorButton.style.height = '30px'
      colorButton.style.margin = '5px'
      colorButton.addEventListener('click', () => {
        currentColor = color
        ctx.strokeStyle = currentColor
        isErasing = false
      })
      toolbar.appendChild(colorButton)
    })

    const eraserButton = document.createElement('button')
    eraserButton.innerHTML = '🗞️'
    eraserButton.addEventListener('click', () => {
      isErasing = true
    })
    toolbar.appendChild(eraserButton)

    const exitButton = document.createElement('button')
    exitButton.innerHTML = 'x'
    exitButton.addEventListener('click', exitMarkingMode)
    toolbar.appendChild(exitButton)

    document.body.appendChild(toolbar)
  }

  function enterMarkingMode() {
    if (!isMarking) {
      createCanvas()
      createToolbar()

      canvas.style.zIndex = "100" // 讓canvas畫出來的內容能保持在最上層
      toolbar.style.zIndex = "101" // toolbar的zIndex需大於canvas，否則會選不到

      // document.body.style.userSelect = 'none' // 選取模式會影響畫圖，所以進入標記模式時，要先關閉

      isMarking = true
    }
  }

  function exitMarkingMode() {
    if (isMarking) {
      document.body.removeChild(canvas)
      document.body.removeChild(toolbar)
      isMarking = false
      // document.body.style.userSelect = originalUserSelect
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'm') {
      enterMarkingMode()
    } else if (e.altKey && e.key === 'c') {
      clearCanvas()
    }
  })
}
