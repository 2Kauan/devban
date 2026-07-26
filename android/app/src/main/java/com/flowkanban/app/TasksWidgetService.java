package com.flowkanban.app;

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
        return new TasksWidgetFactory(this.getApplicationContext());
    }
}

class TasksWidgetFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private List<TaskItem> tasksList = new ArrayList<>();

    public TasksWidgetFactory(Context context) {
        this.context = context;
    }

    private void loadTasksFromPrefs() {
        tasksList.clear();
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String tasksJson = prefs.getString("widget_tasks", "[]");
        try {
            JSONArray arr = new JSONArray(tasksJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                tasksList.add(new TaskItem(
                    obj.optString("id", ""),
                    obj.optString("title", "Sem título"),
                    obj.optString("priority", "low"),
                    obj.optString("projectId", "")
                ));
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

        // Priority dot color customization
        int dotColor = 0xFF22C55E; // Green
        if ("high".equalsIgnoreCase(item.priority)) {
            dotColor = 0xFFEF4444; // Red
        } else if ("medium".equalsIgnoreCase(item.priority)) {
            dotColor = 0xFFF59E0B; // Yellow/Orange
        }
        // Apply dot color if we wanted to dynamically tint it, or let's keep it simple.

        // FillInIntent to launch app on click
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
