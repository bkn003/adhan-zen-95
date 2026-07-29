package app.lovable.adhan_zen_95;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Rebuilds all prayer alarms + re-arms the daily background sync after:
 *  - device boot
 *  - app upgrade (MY_PACKAGE_REPLACED)
 *  - time / timezone change
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        NotifChannels.ensure(context);
        AlarmScheduler.rescheduleFromPersisted(context);
        // Re-enqueue background sync so notifications keep firing without opening the app
        try {
            SyncScheduler.enqueueDaily(context);
        } catch (Throwable ignored) {}
    }
}
