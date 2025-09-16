<!-- src/components/TaskTable.vue -->
<template>
  <div class="card p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">A类关键任务台账</h2>
      <button class="btn btn-primary" @click="addNewTask">
        <i class="fas fa-plus mr-2"></i>新增任务
      </button>
    </div>
    
    <div class="mb-4 flex flex-wrap gap-2">
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="搜索任务..."
        class="input-field"
      >
      <select v-model="filterClass" class="input-field">
        <option value="">所有类别</option>
        <option value="A">A类（事故前）</option>
        <option value="C">C类（事故后）</option>
      </select>
    </div>
    
    <div class="table-responsive">
      <table class="w-full">
        <thead>
          <tr>
            <th>任务代码</th>
            <th>任务名称</th>
            <th>类别</th>
            <th>辐射区</th>
            <th>RF类型</th>
            <th>BHEP</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in filteredTasks" :key="task.id">
            <!-- 片段：表格列 -->
<td>{{ task.taskCode }}</td>
<td><input v-model="task.taskName" class="input-field text-sm" /></td>
<td>
  <select v-model="task.accidentClass" class="input-field text-sm">
    <option value="A">A类</option>
    <option value="C">C类</option>
  </select>
</td>
<td class="text-center">
  <input type="checkbox" v-model="task.isRadiationZone">
</td>
<td>
  <div class="flex flex-wrap gap-1">
    <label class="inline-flex items-center">
      <input type="checkbox" v-model="task.rfIndication" class="mr-1">指示
    </label>
    <label class="inline-flex items-center">
      <input type="checkbox" v-model="task.rfPostcheck" class="mr-1">后检
    </label>
    <label class="inline-flex items-center">
      <input type="checkbox" v-model="task.rfSupervision" class="mr-1">监督
    </label>
    <label class="inline-flex items-center">
      <input type="checkbox" v-model="task.rfRound" class="mr-1">巡检
    </label>
  </div>
</td>

            <td>
              <input 
                v-model.number="task.bhep" 
                type="number" 
                step="0.000000001" 
                class="input-field text-sm w-24"
              >
            </td>
            <td class="flex gap-2">
              <button @click="saveTask(task)" class="btn btn-secondary text-sm">
                保存
              </button>
              <button @click="deleteTask(task.id)" class="btn btn-secondary text-sm bg-red-100">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-if="loading" class="text-center py-4">
      <i class="fas fa-spinner fa-spin text-blue-500"></i> 加载中...
    </div>
    
    <!-- 分页控制 -->
    <div class="mt-4 flex justify-between items-center">
      <div class="text-sm text-gray-600">
        显示 {{ filteredTasks.length }} 条记录中的 {{ currentPage * pageSize }} 条
      </div>
      <div class="flex gap-2">
        <button 
          @click="currentPage--" 
          :disabled="currentPage === 1"
          class="btn btn-secondary"
        >
          上一页
        </button>
        <button 
          @click="currentPage++" 
          :disabled="currentPage * pageSize >= filteredTasks.length"
          class="btn btn-secondary"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

export default {
  setup() {
    const tasks = ref([]);
    const loading = ref(true);
    const searchQuery = ref('');
    const filterClass = ref('');
    const currentPage = ref(1);
    const pageSize = 10;
    
    // API端点
    const API_BASE = 'http://localhost:8089';
    
    // 获取任务列表
    const fetchTasks = async () => {
      try {
        loading.value = true;
        const response = await axios.get(`${API_BASE}/tasks`);
        tasks.value = response.data;
      } catch (error) {
        console.error('获取任务失败:', error);
        alert('获取任务数据失败，请检查后端服务');
      } finally {
        loading.value = false;
      }
    };
    
    // 保存任务
    const saveTask = async (task) => {
      try {
        if (task.id) {
          await axios.put(`${API_BASE}/tasks/${task.id}`, task);
        } else {
          await axios.post(`${API_BASE}/tasks`, task);
        }
        alert('任务保存成功');
        fetchTasks();
      } catch (error) {
        console.error('保存任务失败:', error);
        alert('保存任务失败');
      }
    };
    
    // 删除任务
    const deleteTask = async (id) => {
      if (confirm('确定要删除此任务吗？')) {
        try {
          await axios.delete(`${API_BASE}/tasks/${id}`);
          alert('任务删除成功');
          fetchTasks();
        } catch (error) {
          console.error('删除任务失败:', error);
          alert('删除任务失败');
        }
      }
    };
    
    // 新增任务
    // 片段：新增任务时的默认对象（camelCase 版本）
const addNewTask = () => {
  tasks.value.unshift({
    id: null,
    taskCode: 'NEW-' + Date.now().toString().slice(-4),
    taskName: '',
    accidentClass: 'A',
    isRadiationZone: false,
    rfIndication: false,
    rfPostcheck: false,
    rfSupervision: false,
    rfRound: false,
    bhep: 0.001,
    lub: null,
    uub: null,
  });
};

    
// 片段：搜索过滤（使用 camelCase）
const filteredTasks = computed(() => {
  const q = (searchQuery.value || '').toLowerCase();
  return tasks.value
    .filter(task => {
      const name = (task.taskName || '').toLowerCase();
      const code = (task.taskCode || '').toLowerCase();
      const matchesSearch = name.includes(q) || code.includes(q);
      const matchesClass = !filterClass.value || task.accidentClass === filterClass.value;
      return matchesSearch && matchesClass;
    })
    .slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize);
});
    // 初始化加载
    onMounted(fetchTasks);
    
    return {
      tasks,
      loading,
      searchQuery,
      filterClass,
      currentPage,
      pageSize,
      filteredTasks,
      fetchTasks,
      saveTask,
      deleteTask,
      addNewTask
    };
  }
}
</script>