package com.flowkanban.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class TasksWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

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
                context, 0, addIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_add_task, addPendingIntent);

            // Click Intent Template for list items
            Intent clickIntent = new Intent(Intent.ACTION_VIEW);
            clickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent clickPendingIntent = PendingIntent.getActivity(
                context, 1, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            views.setPendingIntentTemplate(R.id.widget_list, clickPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }
}
