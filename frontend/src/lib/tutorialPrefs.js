/**
 * Tutorial preferences per user (instructor / amu-staff).
 * Keys: tutorial_seen_{userId}, play_tutorial_every_login_{userId}
 */

const SEEN_KEY = (userId) => `tutorial_seen_${userId}`
const PLAY_EVERY_LOGIN_KEY = (userId) => `play_tutorial_every_login_${userId}`
const SESSION_DISMISSED = 'tutorial_dismissed_this_session'

export function hasSeenTutorial(userId) {
  if (!userId) return true
  try {
    return localStorage.getItem(SEEN_KEY(userId)) === '1'
  } catch {
    return true
  }
}

export function setTutorialSeen(userId) {
  if (!userId) return
  try {
    localStorage.setItem(SEEN_KEY(userId), '1')
  } catch {}
}

export function getPlayTutorialEveryLogin(userId) {
  if (!userId) return false
  try {
    return localStorage.getItem(PLAY_EVERY_LOGIN_KEY(userId)) === '1'
  } catch {
    return false
  }
}

export function setPlayTutorialEveryLogin(userId, value) {
  if (!userId) return
  try {
    localStorage.setItem(PLAY_EVERY_LOGIN_KEY(userId), value ? '1' : '0')
  } catch {}
}

export function wasTutorialDismissedThisSession() {
  try {
    return sessionStorage.getItem(SESSION_DISMISSED) === '1'
  } catch {
    return false
  }
}

export function setTutorialDismissedThisSession() {
  try {
    sessionStorage.setItem(SESSION_DISMISSED, '1')
  } catch {}
}
