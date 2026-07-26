package com.flowkanban.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

public class RemoteViewsViewsHelper {
    public static void updateWidgetInstance(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String widgetType = prefs.getString("widget_config_" + appWidgetId + "_type", "list_all");

        int layoutId = R.layout.widget_layout;
        if ("quick_actions".equals(widgetType)) {
            layoutId = R.layout.widget_quick_actions_layout;
        } else if ("productivity_summary".equals(widgetType)) {
            layoutId = R.layout.widget_productivity_layout;
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        if ("quick_actions".equals(widgetType)) {
            setupQuickActions(context, views, appWidgetId);
        } else if ("productivity_summary".equals(widgetType)) {
            setupProductivity(context, views, prefs);
        } else {
            // List types
            setupListWidget(context, views, appWidgetId, widgetType);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
        if (!"quick_actions".equals(widgetType) && !"productivity_summary".equals(widgetType)) {
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_list);
        }
    }

    private static void setupQuickActions(Context context, RemoteViews views, int appWidgetId) {
        // Nova Tarefa
        Intent addIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("com.flowkanban.app://dashboard?action=new_task"));
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_action_new_task, PendingIntent.getActivity(
            context, appWidgetId * 10 + 1, addIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Pesquisar
        Intent searchIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("com.flowkanban.app://dashboard?action=search"));
        searchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_action_search, PendingIntent.getActivity(
            context, appWidgetId * 10 + 2, searchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Agenda/Calendário
        Intent calIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("com.flowkanban.app://calendar"));
        calIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_action_calendar, PendingIntent.getActivity(
            context, appWidgetId * 10 + 3, calIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Dashboard
        Intent dashIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("com.flowkanban.app://dashboard"));
        dashIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_action_dashboard, PendingIntent.getActivity(
            context, appWidgetId * 10 + 4, dashIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));
    }

    private static void setupProductivity(Context context, RemoteViews views, SharedPreferences prefs) {
        int completed = prefs.getInt("widget_stats_completed", 0);
        int pending = prefs.getInt("widget_stats_pending", 0);
        int total = completed + pending;
        int progress = total > 0 ? (completed * 100) / total : 0;

        views.setTextViewText(R.id.text_completed_count, String.valueOf(completed));
        views.setTextViewText(R.id.text_pending_count, String.valueOf(pending));
        views.setTextViewText(R.id.text_progress_percent, progress + "%");
        views.setProgressBar(R.id.widget_progress_bar, 100, progress, false);
    }

    private static void setupListWidget(Context context, RemoteViews views, int appWidgetId, String widgetType) {
        // Change title based on type
        String title = "DevBan";
        if ("list_overdue".equals(widgetType)) title = "Atrasadas";
        else if ("list_progress".equals(widgetType)) title = "Em Andamento";
        else if ("list_completed".equals(widgetType)) title = "Concluídas";
        else if ("list_favorites".equals(widgetType)) title = "Favoritos";

        views.setTextViewText(R.id.widget_title, title);

        // Bind the ListView adapter service
        Intent serviceIntent = new Intent(context, TasksWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list, serviceIntent);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // Add Click Intent for the "+" button
        Intent addIntent = new Intent(Intent.ACTION_VIEW);
        addIntent.setData(Uri.parse("com.flowkanban.app://dashboard?action=new_task"));
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent addPendingIntent = PendingIntent.getActivity(
            context, appWidgetId * 100, addIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_add_task, addPendingIntent);

        // Click Intent Template for list items
        Intent clickIntent = new Intent(Intent.ACTION_VIEW);
        clickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent clickPendingIntent = PendingIntent.getActivity(
            context, appWidgetId * 100 + 1, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.widget_list, clickPendingIntent);
    }
}
