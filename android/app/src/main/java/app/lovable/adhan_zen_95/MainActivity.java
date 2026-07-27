package app.lovable.adhan_zen_95;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the native Adhan alarm plugin before Bridge initialization
        registerPlugin(AdhanNativePlugin.class);
        super.onCreate(savedInstanceState);
        // Ensure notification channel exists as soon as app opens
        NotifChannels.ensure(getApplicationContext());
    }
}
