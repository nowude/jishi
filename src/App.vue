<template>
  <div class="app-container">
    <div class="main-content">
      <router-view />
    </div>
    <van-tabbar v-model="activeTab" route safe-area-inset-bottom placeholder>
      <van-tabbar-item to="/" icon="clock-o" name="home">今日</van-tabbar-item>
      <van-tabbar-item to="/calendar" icon="calendar-o" name="calendar">日历</van-tabbar-item>
      <van-tabbar-item to="/stats" icon="chart-trending-o" name="stats">统计</van-tabbar-item>
      <van-tabbar-item to="/settings" icon="setting-o" name="settings">设置</van-tabbar-item>
    </van-tabbar>
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
}

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
