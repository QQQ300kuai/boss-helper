import { watchThrottled } from '@vueuse/core'

import { ref } from '#imports'
import { counter } from '@/message'
import type { Statistics } from '@/types/formData'
import { getCurDay } from '@/utils'
import deepmerge, { jsonClone } from '@/utils/deepmerge'
import { logger } from '@/utils/logger'

export const todayKey = 'local:web-geek-job-Today'
export const statisticsKey = 'local:web-geek-job-Statistics'

export const useStatistics = () => {
  const createStatistics = (): Statistics => ({
    date: getCurDay(),
    success: 0,
    total: 0,
    repeat: 0,
    activityFilter: 0,
    tasks: {},
  })
  const todayData = ref<Statistics>(createStatistics())

  const statisticsData = ref<Statistics[]>([])

  watchThrottled(
    todayData,
    (v) => {
      void counter.storageSet(todayKey, jsonClone(v))
    },
    { throttle: 200, deep: true },
  )

  async function updateStatistics(curData = jsonClone(todayData.value)) {
    const date = getCurDay()
    void counter.storageGet<Statistics[]>(statisticsKey, []).then((data) => {
      statisticsData.value = data
    })

    const g = await counter.storageGet(todayKey, curData)
    logger.debug('统计数据:', date, g)
    if (g.date === date) {
      todayData.value = deepmerge(curData, g, { clone: false })
      return
    }

    const statistics = await counter.storageGet(statisticsKey, [])

    const newStatistics = [g, ...statistics]
    const newTodayData = createStatistics()
    await counter.storageSet(statisticsKey, newStatistics)
    await counter.storageSet(todayKey, newTodayData)
    todayData.value = newTodayData
    statisticsData.value = newStatistics
  }

  async function clearTodaySuccess() {
    todayData.value.success = 0
    await counter.storageSet(todayKey, jsonClone(todayData.value))
  }

  return {
    todayData,
    statisticsData,
    updateStatistics,
    clearTodaySuccess,
  }
}
