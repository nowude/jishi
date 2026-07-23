<template>
  <div class="app-container">
    <div class="main-content">
      <router-view />
    </div>

    <nav class="tab-bar">
      <router-link to="/" class="tab-item" :class="{ active: activeTab === 'home' }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>今日</span>
      </router-link>
      <router-link to="/calendar" class="tab-item" :class="{ active: activeTab === 'calendar' }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>日历</span>
      </router-link>
      <router-link to="/stats" class="tab-item" :class="{ active: activeTab === 'stats' }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span>统计</span>
      </router-link>
      <router-link to="/settings" class="tab-item" :class="{ active: activeTab === 'settings' }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref('home')

watch(
  () => route.path,
  (path) => {
    if (path === '/') activeTab.value = 'home'
    else if (path.startsWith('/calendar')) activeTab.value = 'calendar'
    else if (path.startsWith('/stats')) activeTab.value = 'stats'
    else if (path.startsWith('/settings')) activeTab.value = 'settings'
    else activeTab.value = ''
  },
  { immediate: true }
)
</script>

<style scoped>
.app-container {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-bar {
  display: flex;
  height: 56px;
  background: #fff;
  border-top: 1px solid #ebedf0;
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  position: relative;
  z-index: 20;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #7d7e80;
  text-decoration: none;
  font-size: 11px;
  font-weight: 400;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s;
  position: relative;
}

.tab-item.active { color: #1989fa; }

.tab-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: #1989fa;
  border-radius: 0 0 3px 3px;
}

.tab-icon {
  width: 22px;
  height: 22px;
}
</style>
