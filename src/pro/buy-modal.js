import { startCheckout } from './api.js'

const TIERS = [
  { id: 'starter', label: '30 Sessions',   price: '$2.99',    note: '~10¢/session',   popular: false },
  { id: 'popular', label: '100 Sessions',  price: '$7.99',    note: '~8¢/session',    popular: true  },
  { id: 'power',   label: '300 Sessions',  price: '$19.99',   note: '~7¢/session',    popular: false },
  { id: 'monthly', label: 'Monthly Pro',   price: '$9.99/mo', note: '200 sessions/mo', popular: false },
]

export function showBuyModal(triggerEl) {
  const existing = document.getElementById('buy-modal-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'buy-modal-overlay'
  overlay.innerHTML = `
    <div class="buy-modal">
      <button class="modal-close" id="modal-close">✕</button>
      <h2 class="modal-title">Get AI Feedback Credits</h2>
      <p class="modal-sub">One credit = one AI writing session. Never expires.</p>
      <div class="tiers">
        ${TIERS.map(t => `
          <button class="tier-btn ${t.popular ? 'popular' : ''}" data-tier="${t.id}">
            ${t.popular ? '<div class="tier-badge">Most Popular</div>' : ''}
            <div class="tier-label">${t.label}</div>
            <div class="tier-price">${t.price}</div>
            <div class="tier-note">${t.note}</div>
          </button>
        `).join('')}
      </div>
      <p class="modal-footer">Powered by Stripe · No subscription lock-in</p>
    </div>`

  document.body.appendChild(overlay)

  overlay.querySelector('#modal-close').onclick = () => overlay.remove()
  overlay.onclick = e => { if (e.target === overlay) overlay.remove() }

  overlay.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = 'Redirecting...'
      try {
        await startCheckout(btn.dataset.tier)
      } catch (err) {
        btn.disabled = false
        btn.textContent = 'Try again'
        console.error(err)
      }
    })
  })
}
