package app.lovable.adhan_zen_95.di

import android.content.Context
import androidx.room.Room
import app.lovable.adhan_zen_95.data.local.AdhanDatabase
import app.lovable.adhan_zen_95.data.local.LocationDao
import app.lovable.adhan_zen_95.data.local.PrayerTimeDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing database and DAO instances.
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AdhanDatabase {
        return Room.databaseBuilder(
            context,
            AdhanDatabase::class.java,
            AdhanDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()
    }
    
    @Provides
    @Singleton
    fun provideLocationDao(database: AdhanDatabase): LocationDao {
        return database.locationDao()
    }
    
    @Provides
    @Singleton
    fun providePrayerTimeDao(database: AdhanDatabase): PrayerTimeDao {
        return database.prayerTimeDao()
    }
}
