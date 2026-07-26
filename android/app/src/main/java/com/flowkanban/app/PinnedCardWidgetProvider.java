package com.flowkanban.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class PinnedCardWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String cardJsonStr = prefs.getString("pinned_card_data", null);

        String title = "Nenhuma tarefa fixada";
        String description = "Use o botão 'Fixar' dentro do app para fixar uma tarefa.";
        String priority = "low";
        String projectId = "";

        if (cardJsonStr != null) {
            try {
                JSONObject obj = new JSONObject(cardJsonStr);
                title = obj.optString("title", "Sem título");
                description = obj.optString("description", "Sem descrição");
                priority = obj.optString("priority", "low");
                projectId = obj.optString("projectId", "");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_card_layout);
            
            // Set text values
            views.setTextViewText(R.id.card_title, title);
            views.setTextViewText(R.id.card_desc, description);

            // Set priority dot
            int dotRes = R.drawable.priority_dot_low; // default green
            // Dynamically show priority colors
            // In Android, we can change the background color/tint of views or keep it simple.

            // Click Intent to open app directly on that project/card
            Intent clickIntent = new Intent(Intent.ACTION_VIEW);
            String deepLink = "com.flowkanban.app://dashboard";
            if (!projectId.isEmpty()) {
                deepLink = "com.flowkanban.app://project/" + projectId;
            }
            clickIntent.setData(Uri.parse(deepLink));
            clickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.card_title, pendingIntent);
            views.setOnClickPendingIntent(R.id.card_desc, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }
}
