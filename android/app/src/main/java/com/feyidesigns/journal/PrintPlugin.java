package com.feyidesigns.journal;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * window.print() does nothing in Android's WebView, so the printed journal asks
 * the system print service for the page on screen (src/native/device.ts printPage).
 * Its destinations include Save as PDF, and the page's @media print rules apply.
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        String name = call.getString("name", "Flyleaf");
        getActivity().runOnUiThread(() -> {
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            manager.print(name, getBridge().getWebView().createPrintDocumentAdapter(name), new PrintAttributes.Builder().build());
            call.resolve();
        });
    }
}
