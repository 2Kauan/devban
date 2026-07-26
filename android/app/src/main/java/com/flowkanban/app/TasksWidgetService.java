package com.flowkanban.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class TasksWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, 
            AppWidgetManager.INVALID_APPWIDGET_ID
        );
        return new TasksWidgetFactory(this.getApplicationContext(), appWidgetId);
    }
}

class TasksWidgetFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private int appWidgetId;
    private List<TaskItem> tasksList = new ArrayList<>();

    public TasksWidgetFactory(Context context, int appWidgetId) {
        this.context = context;
        this.appWidgetId = appWidgetId;
    }

    private void loadTasksFromPrefs() {
        tasksList.clear();
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        
        // Carrega configurações específicas deste Widget ID
        String type = prefs.getString("widget_config_" + appWidgetId + "_type", "list_all");
        String projectId = prefs.getString("widget_config_" + appWidgetId + "_project", "all");
        int maxItems = prefs.getInt("widget_config_" + appWidgetId + "_max", 10);

        String tasksJson = prefs.getString("widget_tasks", "[]");
        try {
            JSONArray arr = new JSONArray(tasksJson);
            int count = 0;
            for (int i = 0; i < arr.length(); i++) {
                if (count >= maxItems) break;

                JSONObject obj = arr.getJSONObject(i);
                
                // Filtro de Projeto
                String cardProjId = obj.optString("projectId", "");
                if (!"all".equals(projectId) && !projectId.equals(cardProjId)) {
                    continue;
                }

                // Filtro de Tipo/Status
                String status = obj.optString("status", "");
                boolean isFavorite = obj.optBoolean("favorite", false);
                if ("list_overdue".equals(type) && !"overdue".equals(status)) continue;
                if ("list_progress".equals(type) && !"in_progress".equals(status)) continue;
                if ("list_completed".equals(type) && !"completed".equals(status)) continue;
                if ("list_favorites".equals(type) && !isFavorite) continue;

                tasksList.add(new TaskItem(
                    obj.optString("id", ""),
                    obj.optString("title", "Sem título"),
                    obj.optString("priority", "low"),
                    cardProjId
                ));
                count++;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onCreate() {
        loadTasksFromPrefs();
    }

    @Override
    public void onDataSetChanged() {
        loadTasksFromPrefs();
    }

    @Override
    public void onDestroy() {
        tasksList.clear();
    }

    @Override
    public int getCount() {
        return tasksList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= tasksList.size()) return null;
        TaskItem item = tasksList.get(position);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_item);
        views.setTextViewText(R.id.item_title, item.title);

        // Altera a cor do círculo de prioridade
        int dotRes = R.drawable.priority_dot_low; // default green
        // (Futuro: poderíamos ter dots diferentes se necessário, mas mantemos simples e rápido)

        // FillInIntent para abrir o app na tela correta do card/projeto
        Intent fillInIntent = new Intent();
        String deepLink = "com.flowkanban.app://dashboard";
        if (item.projectId != null && !item.projectId.isEmpty()) {
            deepLink = "com.flowkanban.app://project/" + item.projectId;
        }
        fillInIntent.setData(Uri.parse(deepLink));
        views.setOnClickFillInIntent(R.id.item_title, fillInIntent);
        views.setOnClickFillInIntent(R.id.item_checkbox, fillInIntent);

        return views;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }

    static class TaskItem {
        String id;
        String title;
        String priority;
        String projectId;

        TaskItem(String id, String title, String priority, String projectId) {
            this.id = id;
            this.title = title;
            this.priority = priority;
            this.projectId = projectId;
        }
    }
}
