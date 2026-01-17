import Task from "../models/taskModel.js";
import Category from "../models/categoryModel.js";

class TaskService {
  /** Get tasks with optional categories based on request filters */
  static async getTasksWithOptions({
    userId,
    filters = null,
    includeCategories = false,
  }) {
    try {
      const tasksPromise = filters
        ? Task.getByFilters({ userId, ...filters })
        : Task.getAll(userId);

      const categoriesPromise = includeCategories
        ? Category.getAll(userId)
        : null;

      const [tasks, categories] = await Promise.all([
        tasksPromise,
        categoriesPromise,
      ]);

      const data = { tasks };
      if (includeCategories) {
        data.categories = categories;
      }

      return data;
    } catch (error) {
      throw new Error("Failed to fetch tasks and categories");
    }
  }

  /** Create a new task */
  static async createTask(taskData) {
    try {
      return await Task.create(taskData);
    } catch (error) {
      throw error;
    }
  }

  /** Update a task */
  static async updateTask(taskId, newData) {
    try {
      return await Task.update({ taskId, ...newData });
    } catch (error) {
      throw error;
    }
  }

  /** Delete a task */
  static async deleteTask(taskId) {
    try {
      await Task.delete(taskId);
    } catch (error) {
      throw error;
    }
  }
}

export default TaskService;
