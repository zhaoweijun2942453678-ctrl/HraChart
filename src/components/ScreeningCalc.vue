<!-- src/components/ScreeningCalc.vue -->
<template>
  <div class="card p-6">
    <h2 class="text-xl font-semibold mb-4">C类任务筛选计算</h2>
    
    <!-- 任务 & 场景选择 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium mb-1">选择任务</label>
        <select v-model="selectedTask" class="input-field">
          <option v-for="task in cClassTasks" :key="task.id" :value="task">
            {{ task.taskCode }} - {{ task.taskName }}
          </option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">选择场景</label>
        <select v-model="selectedScenario" class="input-field">
          <option v-for="scenario in scenarios" :key="scenario.id" :value="scenario">
            {{ scenario.scenCode }} - {{ scenario.scenName }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- 输入区 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium mb-1">Tm (分钟)</label>
        <input 
          v-model.number="tmMinutes" 
          type="number" 
          class="input-field"
          :disabled="selectedScenario?.tmMinutes"
        >
        <p v-if="selectedScenario?.tmMinutes" class="text-xs text-gray-500 mt-1">
          来自场景: {{ selectedScenario.tmMinutes }} 分钟
        </p>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Ta (分钟)</label>
        <input v-model.number="taMinutes" type="number" class="input-field">
        <div class="mt-1 flex items-center">
          <input 
            type="checkbox" 
            v-model="controlRoomOutside" 
            id="outsideCheckbox"
            class="mr-2"
          >
          <label for="outsideCheckbox" class="text-sm">控制室外 (+15分钟)</label>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">复杂度</label>
        <select v-model="complexity" class="input-field">
          <option value="SIMPLE">简单</option>
          <option value="COMPLEX">复杂</option>
        </select>
      </div>
    </div>
    
    <!-- RF -->
    <div class="mb-6">
      <h3 class="text-sm font-medium mb-2">恢复因子 (RF)</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="rf in rfTypes" :key="rf.code" class="flex items-center">
          <input 
            type="checkbox" 
            v-model="rfFlags[rf.code]" 
            :id="rf.code"
            class="mr-2"
          >
          <label :for="rf.code" class="text-sm">{{ rf.name }}</label>
        </div>
      </div>
    </div>
    
    <!-- 计算按钮 -->
    <button 
      @click="calculate" 
      class="btn btn-primary w-full py-3"
      :disabled="loading"
    >
      <span v-if="!loading">计算 HEP</span>
      <span v-else><i class="fas fa-spinner fa-spin mr-2"></i>计算中...</span>
    </button>
    <TimeBandBar 
      :td="result?.td ?? null"
      :band="result?.band ?? ''"
      :disabled="!tmMinutes || tmMinutes<=0"
    />
    <!-- 结果 -->
    <div v-if="result" class="mt-6 p-4 bg-blue-50 rounded-lg">
      <h3 class="text-lg font-semibold mb-3">计算结果</h3>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="p-3 bg-white rounded shadow">
          <h4 class="text-sm font-medium text-gray-500">诊断时间 (Td)</h4>
          <p class="text-xl font-bold">{{ result.td }} 分钟</p>
        </div>
        
        <div class="p-3 bg-white rounded shadow">
          <h4 class="text-sm font-medium text-gray-500">时间窗</h4>
          <p class="text-xl font-bold">{{ result.band }}</p>
        </div>
        
        <div class="p-3 bg-white rounded shadow">
          <h4 class="text-sm font-medium text-gray-500">诊断HEP</h4>
          <p class="text-xl font-bold">{{ result.hepDiag.toFixed(6) }}</p>
        </div>
        
        <div class="p-3 bg-white rounded shadow">
          <h4 class="text-sm font-medium text-gray-500">复杂度因子</h4>
          <p class="text-xl font-bold">{{ result.complexityFactor }}</p>
        </div>
        
        <div class="p-3 bg-white rounded shadow">
          <h4 class="text-sm font-medium text-gray-500">RF失效概率</h4>
          <p class="text-xl font-bold">{{ result?.rfFail?.toFixed(6) }}</p>
        </div>
        
        <div class="p-3 bg-white rounded shadow">
          <h4 class="text-sm font-medium text-gray-500">最终HEP</h4>
          <p class="text-xl font-bold text-red-600">{{ result.hepFinal.toFixed(6) }}</p>
        </div>
      </div>
      
      <div class="mt-4">
        <h4 class="font-medium mb-2">计算说明</h4>
        <p class="text-sm bg-white p-3 rounded">
          最终HEP = 诊断HEP × 复杂度因子 + RF失效概率 = 
          {{ result.hepDiag.toFixed(6) }} × {{ result.complexityFactor }} + 
          {{ result?.rfFail?.toFixed(6) }} = {{ result.hepFinal.toFixed(6) }}
        </p>
      </div>
    </div>
    
    <div v-if="error" class="mt-4 p-3 bg-red-100 text-red-700 rounded">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import TimeBandBar from './TimeBandBar.vue'
import axios from 'axios';

// 工具函数：camelCase ↔ snake_case 转换
function toSnakeCase(obj) {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/([A-Z])/g, "_$1").toLowerCase(),
        toSnakeCase(v)
      ])
    );
  }
  return obj;
}

function toCamelCase(obj) {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        toCamelCase(v)
      ])
    );
  }
  return obj;
}

export default {
  emits: ['calc-completed'],
   components: { TimeBandBar },
  setup(props, { emit }) {
    
    const API_BASE = 'http://localhost:8089';
    
    const tasks = ref([]);
    const scenarios = ref([]);
    const selectedTask = ref(null);
    const selectedScenario = ref(null);
    const tmMinutes = ref(60);
    const taMinutes = ref(15);
    const complexity = ref('SIMPLE');
    const controlRoomOutside = ref(false);
    const result = ref(null);
    const error = ref(null);
    const loading = ref(false);
    
    const rfTypes = ref([
      { code: 'INDICATION', name: '指示' },
      { code: 'POSTCHECK', name: '后检' },
      { code: 'SUPERVISION', name: '监督' },
      { code: 'ROUNDS', name: '巡检' }
    ]);
    
    const rfFlags = ref({
      INDICATION: false,
      POSTCHECK: false,
      SUPERVISION: false,
      ROUNDS: false
    });
    // --- 只筛 C 类任务 ---
    const cClassTasks = computed(() => {
      return tasks.value.filter(task => task.accidentClass === 'C');
    });
    // --- 拉取数据 ---
    const fetchTasks = async () => {
      try {
        const response = await axios.get(`${API_BASE}/tasks`);
        tasks.value = toCamelCase(response.data);
        if (cClassTasks.value.length > 0) {
          selectedTask.value = cClassTasks.value[0];
        }
      } catch (err) {
        console.error('获取任务失败:', err);
        error.value = '获取任务数据失败';
      }
    };
    
    const fetchScenarios = async () => {
      try {
        const response = await axios.get(`${API_BASE}/scenarios`);
        scenarios.value = toCamelCase(response.data);
        if (scenarios.value.length > 0) {
          selectedScenario.value = scenarios.value[0];
        }
      } catch (err) {
        console.error('获取场景失败:', err);
        error.value = '获取场景数据失败';
      }
    };
    
    watch(selectedScenario, (newScenario) => {
      if (newScenario && newScenario.tmMinutes) {
        tmMinutes.value = newScenario.tmMinutes;
      }
    });
    // --- 计算 ---
    const calculate = async () => {
      if (!selectedTask.value) {
        error.value = '请选择任务';
        return;
      }
      if (!tmMinutes.value || !taMinutes.value) {
        error.value = '请填写Tm和Ta';
        return;
      }
      
      try {
        loading.value = true;
        error.value = null;
        const rfChecked = [];
    for (const [key, value] of Object.entries(rfFlags.value)) {
      if (value) rfChecked.push(key);
    }
        
        const payload = toSnakeCase({
          taskId: selectedTask.value.id,
          scenarioId: selectedScenario.value?.id || null,
          tmMinutes: tmMinutes.value,
          taMinutes: controlRoomOutside.value ? taMinutes.value + 15 : taMinutes.value,
          complexity: complexity.value,
          controlRoomOutside: controlRoomOutside.value,
           rfChecked: Object.keys(rfFlags.value).filter(key => rfFlags.value[key])
        });
         // 🔑 判断 URL
        const response = await axios.post(`${API_BASE}/api/calc/c_screen`, payload);
        result.value = toCamelCase(response.data);
        emit('calc-completed', result.value);
      } catch (err) {
        console.error('计算失败:', err);
        error.value = err.response?.data?.error || '计算失败，请检查输入';
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(() => {
      fetchTasks();
      fetchScenarios();
    });
    
    return {
      tasks,
      scenarios,
      cClassTasks,
      selectedTask,
      selectedScenario,
      tmMinutes,
      taMinutes,
      complexity,
      controlRoomOutside,
      rfTypes,
      rfFlags,
      result,
      error,
      loading,
      calculate
    };
  }
}
</script>
