import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd
} from './game.js'
import type { GameMode } from './game.js'

let currentMode: string | null = null
let currentRoomId: string | null = null  

setOnGameEnd((winnerId: string) => {
  alert(`Player ${winnerId} wins!`)
})

const navigate = (path: string) => {
  if (path === window.location.pathname) return
  history.pushState({}, '', path)
  console.log('Navigating to:', path)
  route()
}


function route() {
  const path = window.location.pathname
  hideAllPages()

  if (path === '/tournament') {
    document.getElementById('tournament-page')!.style.display='block';
    renderTournamentList();            // fill right column
    return;                            // <- stop here
  }

  if (path.startsWith('/game')) {
    document.getElementById('game-container')!.style.display = 'block'
    const mode = path.split('/')[2] || 'pve'
    document.getElementById('game-mode-title')!.textContent = 'Mode: ' + mode

    if (currentMode && currentMode !== mode) {
      stopGame()
    }
    currentMode = mode

    initGameCanvas()
    if (['pve', '1v1', 'Tournament'].includes(mode)) {
      startGame(mode as GameMode)
    }

    setOnGameEnd((winnerId: string) => {
      stopGame()
      alert(`Game over! Player ${winnerId} wins!`)
    })
    const mapping:Record<string,string>={
      '/profile':'profile-page','/settings':'settings-page'
    };
    const pageId=mapping[path];
    if(pageId)  document.getElementById(pageId)!.style.display='block';
    else        document.getElementById('main-menu')!.style.display='block';
    return
  }

  const mapping: Record<string, string> = {
    '/profile': 'profile-page',
    '/settings': 'settings-page'
  }
  const pageId = mapping[path]
  if (pageId) {
    document.getElementById(pageId)!.style.display = 'block'
  } else {
    document.getElementById('main-menu')!.style.display = 'block'
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/game/1v1',
    'Tournament-btn'  : '/tournaments',
  }

  Object.entries(btnMap).forEach(([btnId, routePath]) => {
    document.getElementById(btnId)?.addEventListener('click', () => navigate(routePath))
  })

  window.addEventListener('popstate', route)
  route()
})


// ➊ include the new page in hideAllPages()
function hideAllPages() {
  ['main-menu','profile-page','settings-page',
   'game-container','tournament-page'           // ← add me
  ].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
}

// ➋ make the router show the lobby


// ➌ navigation table – Tournament now → /tournament
const btnMap:Record<string,string>={
  'sp-vs-pve-btn':'/game/pve',
  'one-vs-one-btn':'/game/1v1',
  'Tournament-btn':'/tournament',        // ← changed
  'settings-btn':'/settings',
  'profile-btn':'/profile'
};

document.addEventListener('DOMContentLoaded',()=>{
  // existing loop over btnMap
  Object.entries(btnMap).forEach(([btnId,routePath])=>{
    document.getElementById(btnId)?.addEventListener('click',()=>navigate(routePath));
  });

  // lobby‑specific buttons
  document.getElementById('t-back-btn')!
          .addEventListener('click',()=>navigate('/'));
  document.getElementById('t-create-btn')!
          .addEventListener('click',()=>alert('TODO: create new tournament'));

  // clicking a card’s JOIN button will be delegated later
  window.addEventListener('popstate',route);
  route();
});

// ➍ tiny helper to paint the right column
function renderTournamentList(){
  // 📌 replace this with a real API/WebSocket call
  const demo=[ {name:'Tournament 1',slots:'6/8',joinable:true},
               {name:'Tournament 2',slots:'8/8',joinable:false},
               {name:'Tournament 3',slots:'7/8',joinable:true},
               {name:'Tournament 4',slots:'1/8',joinable:true} ];

  const list=document.getElementById('tournament-list')!;
  list.innerHTML='';                           // clear old
  demo.forEach(t=>{
    const card=document.createElement('div');
    card.className='t-card';
    card.innerHTML=`
      <div>
        <div>${t.name}</div>
        <div>${t.slots}</div>
      </div>
      <button class="join-btn" ${t.joinable?'':'disabled'}>
        ${t.joinable?'JOIN':'FULL'}
      </button>`;
    card.querySelector('.join-btn')!
        .addEventListener('click',()=>navigate('/game/Tournament'));
    list.appendChild(card);
  });
}
