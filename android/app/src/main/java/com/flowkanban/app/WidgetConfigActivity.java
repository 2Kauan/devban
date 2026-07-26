package com.flowkanban.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class WidgetConfigActivity extends Activity {

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private Spinner spinnerProject;
    private Spinner spinnerMaxItems;
    private List<ProjectItem> projectsList = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Set result to CANCELLED in case the user backs out
        setResult(RESULT_CANCELED);

        // Find the App Widget ID from the Intent
        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID, 
                AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        // If they opened this without a valid ID, stop
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        setContentView(R.layout.activity_widget_config);

        spinnerProject = findViewById(R.id.spinner_project);
        spinnerMaxItems = findViewById(R.id.spinner_max_items);
        Button btnSave = findViewById(R.id.btn_save_config);

        // Load projects and populate spinner
        loadAvailableProjects();
        List<String> projectNames = new ArrayList<>();
        for (ProjectItem p : projectsList) {
            projectNames.add(p.name);
        }
        ArrayAdapter<String> projectAdapter = new ArrayAdapter<>(
            this, android.R.layout.simple_spinner_item, projectNames
        );
        projectAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerProject.setAdapter(projectAdapter);

        // Max items options
        List<String> maxItemsOptions = new ArrayList<>();
        maxItemsOptions.add("5 tarefas");
        maxItemsOptions.add("10 tarefas");
        maxItemsOptions.add("15 tarefas");
        maxItemsOptions.add("20 tarefas");
        ArrayAdapter<String> maxItemsAdapter = new ArrayAdapter<>(
            this, android.R.layout.simple_spinner_item, maxItemsOptions
        );
        maxItemsAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerMaxItems.setAdapter(maxItemsAdapter);

        btnSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveWidgetConfig();
            }
        });
    }

    private void loadAvailableProjects() {
        projectsList.clear();
        projectsList.add(new ProjectItem("all", "Todos os Projetos"));
        
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String projectsJson = prefs.getString("available_projects", "[]");
        try {
            JSONArray arr = new JSONArray(projectsJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                projectsList.add(new ProjectItem(
                    obj.optString("id", ""),
                    obj.optString("name", "Sem nome")
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void saveWidgetConfig() {
        int selectedProjIndex = spinnerProject.getSelectedItemPosition();
        if (selectedProjIndex < 0 || selectedProjIndex >= projectsList.size()) return;
        
        ProjectItem selectedProj = projectsList.get(selectedProjIndex);
        
        int selectedMaxIndex = spinnerMaxItems.getSelectedItemPosition();
        int maxItems = 10;
        if (selectedMaxIndex == 0) maxItems = 5;
        else if (selectedMaxIndex == 1) maxItems = 10;
        else if (selectedMaxIndex == 2) maxItems = 15;
        else if (selectedMaxIndex == 3) maxItems = 20;

        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        prefs.edit()
             .putString("widget_config_" + appWidgetId + "_project", selectedProj.id)
             .putInt("widget_config_" + appWidgetId + "_max", maxItems)
             .apply();

        // Push widget update broadcast
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        RemoteViewsViewsHelper.updateWidgetInstance(this, appWidgetManager, appWidgetId);

        // Success result
        Intent resultValue = new Intent();
        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_OK, resultValue);
        finish();
    }

    static class ProjectItem {
        String id;
        String name;
        ProjectItem(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }
}
