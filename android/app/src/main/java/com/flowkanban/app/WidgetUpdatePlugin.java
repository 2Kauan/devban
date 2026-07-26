package com.flowkanban.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
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
}
