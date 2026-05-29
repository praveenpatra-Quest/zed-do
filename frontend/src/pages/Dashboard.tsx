import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useTodoStore } from "@/store/todoStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  LogOut, 
  Plus, 
  Trash2, 
  Calendar,
  User as UserIcon,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const { todos, fetchTodos, addTodo, toggleTodo, deleteTodo, loading: todosLoading } = useTodoStore();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    try {
      await addTodo({ title: newTodoTitle, priority: 'medium' });
      setNewTodoTitle("");
      toast.success("Task added");
    } catch (error) {
      toast.error("Failed to add task");
    }
  };

  const filteredTodos = (todos || []).filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="text-primary w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold leading-none">Zen-Do</h1>
              <p className="text-xs text-muted-foreground font-light mt-1">Peaceful Productivity</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-accent/50 rounded-2xl border border-border/50">
              <UserIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{user?.name || user?.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-spring"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-12">
          <h2 className="text-4xl font-display font-bold mb-2">Good Day, {userDisplayName}</h2>
          <p className="text-muted-foreground text-lg font-light italic">"Simplicity is the ultimate sophistication."</p>
        </div>

        <form onSubmit={handleAdd} className="relative mb-12 group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Plus className="text-primary w-6 h-6 group-focus-within:scale-110 transition-spring" />
          </div>
          <Input 
            placeholder="What will you accomplish today?" 
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            className="h-16 pl-14 pr-32 text-xl rounded-3xl bg-card border-border/50 shadow-elegant focus-visible:ring-primary/20 transition-spring"
          />
          <Button 
            type="submit" 
            disabled={!newTodoTitle.trim()}
            className="absolute right-3 top-3 bottom-3 rounded-2xl bg-primary px-6 shadow-glow hover:scale-[1.02] active:scale-95 transition-spring"
          >
            Add Task
          </Button>
        </form>

        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2 p-1 bg-accent/50 rounded-2xl border border-border/50 overflow-x-auto">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-spring ${
                  filter === f ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground font-light hidden sm:block">
            {filteredTodos.length} items remaining
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {todosLoading && todos.length === 0 ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filteredTodos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center border-2 border-dashed border-border/50 rounded-3xl"
              >
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-muted-foreground w-8 h-8" />
                </div>
                <h3 className="text-xl font-display font-bold text-muted-foreground">No tasks found</h3>
                <p className="text-muted-foreground font-light mt-2">Time to enjoy the stillness.</p>
              </motion.div>
            ) : (
              filteredTodos.map((todo) => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group"
                >
                  <Card className={`p-5 rounded-3xl border-border/50 transition-spring hover:shadow-elegant ${
                    todo.completed ? 'bg-accent/30 opacity-75' : 'bg-card'
                  }`}>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => toggleTodo(todo.id)}
                        className="flex-shrink-0 transition-spring hover:scale-110 active:scale-90"
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="w-8 h-8 text-primary fill-primary/10" />
                        ) : (
                          <Circle className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                        )}
                      </button>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className={`text-lg font-medium transition-all truncate ${
                          todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}>
                          {todo.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className={`rounded-lg font-light text-[10px] uppercase tracking-wider ${
                            todo.priority === 'high' ? 'border-destructive text-destructive' : 
                            todo.priority === 'medium' ? 'border-primary text-primary' : ''
                          }`}>
                            {todo.priority}
                          </Badge>
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-spring"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="py-20 text-center opacity-10 select-none pointer-events-none">
        <span className="text-[12rem] font-display font-bold leading-none tracking-tighter">ZEN</span>
      </footer>
    </div>
  );
};

export default Dashboard;
