'use strict';
const CARDS = [
  { id:'fireball', name:'Fireball', image:'fireball2.jpg', damage:35, desc:'Deal 35 damage. A powerful, direct attack.' },
  { id:'blade', name:'The Rumble Blade', image:'blade.jpg', damage:25, pierce:true, desc:'Deal 25 damage, ignoring block.' },
  { id:'scroll', name:'Ancient of Scroll', image:'scrolls.jpg', damage:20, heal:10, desc:'Restore 10 HP, then deal 20 damage.' },
  { id:'defense', name:'Arcane Defense', image:'defense.jpg', damage:0, block:30, reflect:10, desc:'Block up to 30 damage. If you block damage, reflect 10.' }
];
const $ = id => document.getElementById(id);
let state;
let pendingRound = null;

// A pure resolver keeps both sides' effects simultaneous and consistent.
function resolveRound(playerHP, enemyHP, playerCard, enemyCard) {
  const blockedByPlayer = enemyCard.pierce ? 0 : Math.min(enemyCard.damage, playerCard.block || 0);
  const blockedByEnemy = playerCard.pierce ? 0 : Math.min(playerCard.damage, enemyCard.block || 0);
  const toPlayer = enemyCard.damage - blockedByPlayer + (blockedByEnemy ? enemyCard.reflect || 0 : 0);
  const toEnemy = playerCard.damage - blockedByEnemy + (blockedByPlayer ? playerCard.reflect || 0 : 0);
  const playerHealing = Math.min(100 - playerHP, playerCard.heal || 0);
  const enemyHealing = Math.min(100 - enemyHP, enemyCard.heal || 0);
  return { playerHP:Math.max(0, playerHP + playerHealing - toPlayer), enemyHP:Math.max(0, enemyHP + enemyHealing - toEnemy), toPlayer, toEnemy, playerHealing, enemyHealing, blockedByPlayer, blockedByEnemy };
}
function addLog(message, type='') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = message;
  $('combat-log').append(entry);
  while ($('combat-log').children.length > 80) $('combat-log').firstElementChild.remove();
  $('combat-log').scrollTop = $('combat-log').scrollHeight;
}
function render() {
  for (const side of ['player','enemy']) {
    $(`${side}-hp`).style.width = `${state[side+'HP']}%`;
    $(`${side}-hp-text`).textContent = `${state[side+'HP']} HP`;
  }
  $('round').textContent = `ROUND ${state.round}`;
  $('status').textContent = state.message;
  $('cast-btn').disabled = state.selected === null || state.busy || state.over;
  $('inspect-btn').disabled = state.selected === null || state.busy || state.over;
  [...$('hand').children].forEach((button,index) => {
    button.disabled = state.busy || state.over;
    button.classList.toggle('selected', state.selected === index);
    button.setAttribute('aria-pressed', String(state.selected === index));
  });
}
function selectCard(index) {
  if (state.busy || state.over) return;
  state.selected = state.selected === index ? null : index;
  state.message = state.selected === null ? 'Choose your spell.' : `${CARDS[index].name} ready to cast.`;
  render();
}
function showCard(slot, card) {
  slot.innerHTML = '';
  const frame = document.createElement('div');
  frame.className = 'tcg-card casting';
  const img = document.createElement('img');
  img.src = `assets/${card.image}`;
  img.alt = `${card.name}: ${card.desc}`;
  frame.append(img);
  slot.append(frame);
  slot.classList.add('active');
}
function castSpell() {
  if (state.selected === null || state.busy || state.over) return;
  const playerCard = CARDS[state.selected];
  const enemyCard = CARDS[Math.floor(Math.random()*CARDS.length)];
  state.busy = true;
  state.selected = null;
  state.message = 'Spells collide…';
  showCard($('player-slot'), playerCard);
  showCard($('enemy-slot'), enemyCard);
  render();
  pendingRound = setTimeout(() => {
    pendingRound = null;
    const result = resolveRound(state.playerHP, state.enemyHP, playerCard, enemyCard);
    state.playerHP = result.playerHP;
    state.enemyHP = result.enemyHP;
    addLog(`Round ${state.round} · You cast ${playerCard.name}: ${result.toEnemy} damage dealt, ${result.blockedByPlayer} blocked, ${result.playerHealing} HP restored.`, 'player');
    addLog(`Enemy cast ${enemyCard.name}: ${result.toPlayer} damage dealt, ${result.blockedByEnemy} blocked, ${result.enemyHealing} HP restored.`, 'enemy');
    state.busy = false;
    state.over = state.playerHP === 0 || state.enemyHP === 0;
    if (state.over) {
      state.message = state.playerHP === 0 && state.enemyHP === 0 ? 'Draw — both wizards fall.' : state.enemyHP === 0 ? 'Victory! You defeated the rival wizard.' : 'Defeat. Your rival wins this duel.';
      addLog(state.message + ' Restart to play again.');
    } else {
      state.round++;
      state.message = 'Choose your next spell.';
    }
    render();
    if (state.over) $('restart-btn').focus();
    else $('hand').children[CARDS.indexOf(playerCard)].focus({preventScroll:true});
  }, 600);
}
function resetGame() {
  clearTimeout(pendingRound);
  pendingRound = null;
  state = {playerHP:100,enemyHP:100,round:1,selected:null,busy:false,over:false,message:'Choose your spell.'};
  for (const side of ['player','enemy']) {
    $(side+'-slot').innerHTML = '<span class="empty-slot">Awaiting a spell</span>';
    $(side+'-slot').classList.remove('active');
  }
  $('combat-log').innerHTML = '';
  addLog('Duel initiated. Choose one of your four reusable spells.');
  render();
}
CARDS.forEach((card,index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tcg-card';
  button.setAttribute('aria-label', `${card.name}. ${card.desc}`);
  button.innerHTML = `<img src="assets/${card.image}" alt="" draggable="false"><span class="card-copy"><strong class="card-name">${card.name}</strong><span class="card-effect">${card.desc}</span></span>`;
  button.addEventListener('click', () => selectCard(index));
  $('hand').append(button);
});
$('cast-btn').addEventListener('click',castSpell);
$('restart-btn').addEventListener('click',resetGame);
$('inspect-btn').addEventListener('click', () => {
  if (state.selected === null || state.busy || state.over) return;
  const card = CARDS[state.selected];
  $('preview-image').src = `assets/${card.image}`;
  $('preview-image').alt = card.name;
  $('preview-name').textContent = card.name;
  $('preview-effect').textContent = card.desc;
  $('card-preview').showModal();
});
$('close-preview').addEventListener('click', () => $('card-preview').close());
resetGame();
