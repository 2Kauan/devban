package com.flowkanban.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetUpdatePlugin")
public class WidgetUpdatePlugin extends Plugin {
    
    @PluginMethod
    public void updateWidget(PluginCall call) {
        Context context = getContext();
        
        // Update widget layouts
        Intent intent = new Intent(context, TasksWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
            new ComponentName(context, TasksWidgetProvider.class)
        );
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
        
        // Notify ListView to refresh
        AppWidgetManager.getInstance(context).notifyAppWidgetViewDataChanged(ids, R.id.widget_list);
        
        call.resolve();
    }

    @PluginMethod
    public void pinCard(PluginCall call) {
        Context context = getContext();
        String cardData = call.getString("card");
        
        if (cardData != null) {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            prefs.edit().putString("pinned_card_data", cardData).apply();
        }

        // Trigger updates for PinnedCardWidget
        Intent intent = new Intent(context, PinnedCardWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
            new ComponentName(context, PinnedCardWidgetProvider.class)
        );
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);

        // Programmatically request pinning the widget (Oreo 8.0+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName myProvider = new ComponentName(context, PinnedCardWidgetProvider.class);

            if (appWidgetManager.isRequestPinAppWidgetSupported()) {
                appWidgetManager.requestPinAppWidget(myProvider, null, null);
            }
        }

        call.resolve();
    }
}
