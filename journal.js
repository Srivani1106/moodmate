document.addEventListener("DOMContentLoaded", () => {

  /* ================= MOOD ================= */

  const moods = document.querySelectorAll(".mood");

  const savedMood = localStorage.getItem("selectedMood");

  if(savedMood){
    moods.forEach(mood=>{
      if(mood.dataset.mood === savedMood){
        mood.classList.add("selected")
      }
    })
  }

  moods.forEach(mood=>{
    mood.addEventListener("click",()=>{

      moods.forEach(m=>m.classList.remove("selected"))
      mood.classList.add("selected")

      localStorage.setItem("selectedMood", mood.dataset.mood)

    })
  })



  /* ================= JOURNAL SWITCHING ================= */

  const journalButtons = document.querySelectorAll(".journal-types button")

  const notebookEditor = document.getElementById("notebook-editor")
  const qaEditor = document.getElementById("qa-editor")
  const plannerEditor = document.getElementById("planner-editor")
  const wreckEditor = document.getElementById("wreck-editor")

  journalButtons.forEach(button=>{

    button.addEventListener("click",()=>{

      journalButtons.forEach(btn=>btn.classList.remove("active"))
      button.classList.add("active")

      const type = button.dataset.type

      notebookEditor.classList.add("hidden")
      qaEditor.classList.add("hidden")
      plannerEditor.classList.add("hidden")
      wreckEditor.classList.add("hidden")

      if(type==="notebook") notebookEditor.classList.remove("hidden")
      if(type==="qa") qaEditor.classList.remove("hidden")
      if(type==="planner") plannerEditor.classList.remove("hidden")
      if(type==="wreck") wreckEditor.classList.remove("hidden")

    })

  })



  /* ================= Q&A ================= */

  const prompts = [
  "✨ What challenged you today?",
  "✨ What are you grateful for?",
  "✨ What emotion did you feel the most?",
  "✨ What is something you learned today?",
  "✨ What would you like to improve tomorrow?"
  ]

  const addQuestionBtn = document.getElementById("add-question-btn")
  const questionsContainer = document.getElementById("questions-container")

  let promptIndex = 0

  if(addQuestionBtn){

    addQuestionBtn.addEventListener("click",()=>{

      if(promptIndex >= prompts.length){
        alert("No more prompts available")
        return
      }

      const block = document.createElement("div")
      block.classList.add("question-block")

      block.innerHTML = `
      <p class="question">${prompts[promptIndex]}</p>
      <textarea placeholder="Your thoughts..."></textarea>
      `

      questionsContainer.appendChild(block)

      promptIndex++

    })

  }



  /* ================= PLANNER ================= */

  function addItem(containerId){

    const container = document.getElementById(containerId)

    const wrapper = document.createElement("div")
    wrapper.classList.add("task-item")

    wrapper.innerHTML = `
    <input type="checkbox">
    <input type="text" placeholder="Enter here...">
    <button class="delete-item">🗑</button>
    `

    wrapper.querySelector(".delete-item").onclick = ()=>wrapper.remove()

    container.appendChild(wrapper)

  }

  const plannerButtons = [
  ["add-daily-task","daily-tasks"],
  ["add-daily-goal","daily-goals"],
  ["add-weekly-task","weekly-tasks"],
  ["add-weekly-goal","weekly-goals"],
  ["add-monthly-task","monthly-tasks"],
  ["add-monthly-goal","monthly-goals"]
  ]

  plannerButtons.forEach(([btn,container])=>{
    const element = document.getElementById(btn)
    if(element){
      element.addEventListener("click",()=>addItem(container))
    }
  })



  /* ================= PLANNER TABS ================= */

  const plannerTabs = document.querySelectorAll(".planner-tab")

  const dailySection = document.getElementById("daily-section")
  const weeklySection = document.getElementById("weekly-section")
  const monthlySection = document.getElementById("monthly-section")

  plannerTabs.forEach(tab=>{

    tab.addEventListener("click",()=>{

      plannerTabs.forEach(t=>t.classList.remove("active"))
      tab.classList.add("active")

      dailySection.classList.add("hidden")
      weeklySection.classList.add("hidden")
      monthlySection.classList.add("hidden")

      const type = tab.dataset.plan

      if(type==="daily") dailySection.classList.remove("hidden")
      if(type==="weekly") weeklySection.classList.remove("hidden")
      if(type==="monthly") monthlySection.classList.remove("hidden")

    })

  })



  /* ================= WRECK ACTIVITIES BUTTONS ================= */

  const activityButtons = document.querySelectorAll(".wreck-buttons button")

  activityButtons.forEach(button=>{

    button.addEventListener("click",()=>{

      document.querySelectorAll(".wreck-activity").forEach(a=>{
        a.classList.add("hidden")
      })

      const target = button.dataset.activity

      document.getElementById(target).classList.remove("hidden")

    })

  })



  /* ================= POP YOUR WORRIES================= */

const addWorryBtn = document.getElementById("addWorry");
const createBubblesBtn = document.getElementById("createBubbles");
const worryInput = document.getElementById("worryInput");
const worryList = document.getElementById("worryList");
const bubbleArea = document.getElementById("bubbleArea");

let worries = [];

addWorryBtn.addEventListener("click",()=>{

const text = worryInput.value.trim();
if(text === "") return;

worries.push(text);

const li = document.createElement("li");
li.textContent = text;
worryList.appendChild(li);

worryInput.value="";

});

createBubblesBtn.addEventListener("click",()=>{

bubbleArea.innerHTML="";

worries.forEach(text=>{

const bubble = document.createElement("div");
bubble.className="bubble";
bubble.textContent=text;

bubbleArea.appendChild(bubble);

moveBubble(bubble);

// single click pop
bubble.addEventListener("pointerdown",()=>{

bubble.classList.add("pop");

setTimeout(()=>{

bubble.remove();

// check if all bubbles are gone
if(bubbleArea.children.length === 0){
document.getElementById("popMessage").textContent =
"✨ All worries popped! Take a deep breath.";
}

},200);

});
});

});


function moveBubble(bubble){

let x = Math.random()*200
let y = Math.random()*120

let dx = (Math.random()*2 + 1) * (Math.random()<0.5 ? -1 : 1)
let dy = (Math.random()*2 + 1) * (Math.random()<0.5 ? -1 : 1)

bubble.style.left = x + "px"
bubble.style.top = y + "px"

const move = setInterval(()=>{

if(!document.body.contains(bubble)){
clearInterval(move)
return
}

const areaWidth = bubbleArea.clientWidth - bubble.offsetWidth
const areaHeight = bubbleArea.clientHeight - bubble.offsetHeight

x += dx
y += dy

// bounce inside the box
if(x <= 0 || x >= areaWidth) dx *= -1
if(y <= 0 || y >= areaHeight) dy *= -1

bubble.style.left = x + "px"
bubble.style.top = y + "px"

},30)

}
  /* ================= COLOR ACTIVITY ================= */

  /* ================= MANDALA COLORING ================= */

const picker = document.getElementById("colorPicker")
const mandalaCanvas = document.getElementById("mandalaCanvas")
const newMandalaBtn = document.getElementById("newMandala")

const mandalas = [

`
<circle cx="200" cy="200" r="40" class="colorable"/>
<circle cx="200" cy="100" r="25" class="colorable"/>
<circle cx="300" cy="200" r="25" class="colorable"/>
<circle cx="200" cy="300" r="25" class="colorable"/>
<circle cx="100" cy="200" r="25" class="colorable"/>
<polygon points="200,20 230,90 170,90" class="colorable"/>
<polygon points="380,200 310,230 310,170" class="colorable"/>
<polygon points="200,380 230,310 170,310" class="colorable"/>
<polygon points="20,200 90,230 90,170" class="colorable"/>
`,

`
<circle cx="200" cy="200" r="50" class="colorable"/>
<polygon points="200,40 240,120 160,120" class="colorable"/>
<polygon points="360,200 280,240 280,160" class="colorable"/>
<polygon points="200,360 240,280 160,280" class="colorable"/>
<polygon points="40,200 120,240 120,160" class="colorable"/>
<circle cx="200" cy="80" r="20" class="colorable"/>
<circle cx="320" cy="200" r="20" class="colorable"/>
<circle cx="200" cy="320" r="20" class="colorable"/>
<circle cx="80" cy="200" r="20" class="colorable"/>
`,

`
<circle cx="200" cy="200" r="30" class="colorable"/>
<circle cx="200" cy="120" r="30" class="colorable"/>
<circle cx="280" cy="200" r="30" class="colorable"/>
<circle cx="200" cy="280" r="30" class="colorable"/>
<circle cx="120" cy="200" r="30" class="colorable"/>
<polygon points="200,20 250,100 150,100" class="colorable"/>
<polygon points="380,200 300,250 300,150" class="colorable"/>
<polygon points="200,380 250,300 150,300" class="colorable"/>
<polygon points="20,200 100,250 100,150" class="colorable"/>
`

]

function loadMandala(){

if(!mandalaCanvas) return

const random = Math.floor(Math.random()*mandalas.length)

mandalaCanvas.innerHTML = mandalas[random]

activateColoring()

}

function activateColoring(){

document.querySelectorAll(".colorable").forEach(shape=>{

shape.style.fill = "white"

shape.addEventListener("click",()=>{

shape.style.fill = picker.value

})

})

}

if(newMandalaBtn){
newMandalaBtn.addEventListener("click",loadMandala)
}

loadMandala()

/* ================= BURN ================= */
const burnBtn = document.getElementById("burnBtn");
const burnArea = document.getElementById("burnArea");

burnBtn.addEventListener("click",()=>{

burnArea.innerHTML="";

const text=document.getElementById("burnInput").value.trim();
if(text==="") return;

const paper=document.createElement("div");
paper.className="burnPaper";
paper.textContent=text;

/* add flames */

for(let i=0;i<5;i++){

const flame=document.createElement("div");
flame.className="flame";

flame.style.left = Math.random()*240 + "px";
flame.style.top = Math.random()*140 + "px";

paper.appendChild(flame);

}

/* add ashes */

for(let i=0;i<10;i++){

const ash=document.createElement("div");
ash.className="ash";

ash.style.left=Math.random()*240+"px";
ash.style.top=Math.random()*40+"px";

paper.appendChild(ash);

}

burnArea.appendChild(paper);

paper.addEventListener("click",()=>{

paper.classList.add("burning");

setTimeout(()=>{
paper.remove();
},2500);

});

});

  /* ================= BRAIN DUMP ================= */

  const startDump = document.getElementById("startDump")
const clearDump = document.getElementById("clearDump")
const timerText = document.getElementById("timerText")
const timerCircle = document.getElementById("timerCircle")
const brainText = document.getElementById("brainText")
const brainMessage = document.getElementById("brainMessage")

let time = 60
let timer

const circumference = 314

if(startDump){

startDump.addEventListener("click",()=>{

time = 60
brainMessage.textContent=""
brainText.disabled = false
brainText.focus()

timer = setInterval(()=>{

time--

timerText.textContent = time

let progress = circumference - (time/60)*circumference
timerCircle.style.strokeDashoffset = progress

if(time <= 0){

clearInterval(timer)

brainText.disabled = true
brainMessage.textContent = "Brain dump complete. Let your thoughts go."

// fade thoughts away
brainText.classList.add("fade-away")

setTimeout(()=>{
brainText.value=""
brainText.classList.remove("fade-away")
},3000)

}
},1000)

})

}

if(clearDump){

clearDump.addEventListener("click",()=>{

brainText.value=""
brainMessage.textContent=""
timerText.textContent="60"
timerCircle.style.strokeDashoffset=0

})

}

  /* ================= BREAK WALL ================= */
    const wall = document.getElementById("wall")

function createWall(){

if(!wall) return

wall.innerHTML=""

for(let i=0;i<24;i++){

let block=document.createElement("div")
block.classList.add("block")

block.addEventListener("click",()=>{

// bomb sound
new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9b46c0.mp3").play()

// create explosion debris
for(let i=0;i<10;i++){

let piece=document.createElement("div")
piece.classList.add("debris")

piece.style.setProperty("--dx",Math.random())
piece.style.setProperty("--dy",Math.random())

block.appendChild(piece)

}

// explode brick
block.classList.add("explode")

setTimeout(()=>{
block.remove()
},350)

})

wall.appendChild(block)

}

}

createWall()

const resetWall=document.getElementById("resetWall")

if(resetWall){
resetWall.onclick=createWall
}


  /* ================= BREATHING EXERCISE ================= */

  const breathCircle = document.getElementById("breath-circle")
  const breathText = document.getElementById("breathText")

  let phase = "inhale"

  function breathingCycle(){

    if(!breathCircle) return

    if(phase==="inhale"){

      breathText.textContent="Inhale"
      breathCircle.style.transform="scale(1.5)"

      phase="hold"
      setTimeout(breathingCycle,4000)

    }

    else if(phase==="hold"){

      breathText.textContent="Hold"

      phase="exhale"
      setTimeout(breathingCycle,2000)

    }

    else{

      breathText.textContent="Exhale"
      breathCircle.style.transform="scale(1)"

      phase="inhale"
      setTimeout(breathingCycle,4000)

    }

  }

  breathingCycle()

})
/* ================= ZEN SAND GARDEN ================= */

const sandCanvas = document.getElementById("sandCanvas");

if (sandCanvas) {

const ctx = sandCanvas.getContext("2d");

let drawing = false;

sandCanvas.addEventListener("mousedown",(e)=>{
drawing = true;
ctx.beginPath();
ctx.moveTo(e.offsetX,e.offsetY);
});

sandCanvas.addEventListener("mouseup",()=>{
drawing = false;
});

sandCanvas.addEventListener("mousemove",(e)=>{

if(!drawing) return;

ctx.lineWidth = 2;
ctx.strokeStyle = "#8d6e63";  // sand rake color

ctx.lineTo(e.offsetX,e.offsetY);
ctx.stroke();

});

}

const clearSand = document.getElementById("clearSand");

if(clearSand){

clearSand.addEventListener("click",()=>{

const canvas = document.getElementById("sandCanvas");
const ctx = canvas.getContext("2d");

ctx.clearRect(0,0,canvas.width,canvas.height);

});

}
const focusBtn = document.getElementById("focusMode")
const body = document.body
const rightSection = document.querySelector(".right")
const nav = document.querySelector("header")

focusBtn.addEventListener("click",()=>{

body.classList.toggle("focus-mode")

if(body.classList.contains("focus-mode")){

rightSection.style.display="none"
nav.style.display="none"
focusBtn.textContent="Exit Focus"

}
else{

rightSection.style.display="block"
nav.style.display="block"
focusBtn.textContent="Focus Mode"

}

})
document.addEventListener("keydown",(e)=>{

if(e.key==="Escape"){
document.body.classList.remove("focus-mode")
document.querySelector(".right").style.display="block"
document.querySelector("header").style.display="block"
}

})