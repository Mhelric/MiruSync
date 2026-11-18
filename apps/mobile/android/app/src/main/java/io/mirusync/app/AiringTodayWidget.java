package io.mirusync.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class AiringTodayWidget extends AppWidgetProvider {

    private static final int[] ITEM_IDS = {
        R.id.widget_item_0,
        R.id.widget_item_1,
        R.id.widget_item_2,
        R.id.widget_item_3
    };

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_airing_today);

        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("airing_today_widget", "[]");

        for (int id : ITEM_IDS) {
            views.setViewVisibility(id, View.GONE);
        }

        try {
            JSONArray items = new JSONArray(raw);
            if (items.length() == 0) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE);
                int count = Math.min(items.length(), ITEM_IDS.length);
                for (int i = 0; i < count; i++) {
                    JSONObject item = items.getJSONObject(i);
                    String title = item.optString("title", "Unknown");
                    int episode = item.optInt("episode", 0);
                    String time = item.optString("time", "");
                    String line = "Ep " + episode + " · " + time + " — " + title;
                    views.setTextViewText(ITEM_IDS[i], line);
                    views.setViewVisibility(ITEM_IDS[i], View.VISIBLE);
                }
            }
        } catch (Exception e) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
