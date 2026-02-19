package app.lovable.adhan_zen_95.ui.screens.nearby

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.lovable.adhan_zen_95.data.model.Location
import app.lovable.adhan_zen_95.data.repository.LocationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NearbyUiState(
    val isLoading: Boolean = true,
    val locations: List<Location> = emptyList(),
    val filteredLocations: List<Location> = emptyList(),
    val districts: List<String> = emptyList(),
    val selectedDistrict: String? = null,
    val error: String? = null
)

@HiltViewModel
class NearbyViewModel @Inject constructor(
    private val locationRepository: LocationRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(NearbyUiState())
    val uiState: StateFlow<NearbyUiState> = _uiState.asStateFlow()
    
    init {
        loadLocations()
        loadDistricts()
    }
    
    private fun loadLocations() {
        viewModelScope.launch {
            try {
                locationRepository.getAllLocations().collect { locations ->
                    _uiState.update { 
                        it.copy(
                            locations = locations,
                            filteredLocations = locations,
                            isLoading = false
                        ) 
                    }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }
    
    private fun loadDistricts() {
        viewModelScope.launch {
            locationRepository.getAllDistricts().collect { districts ->
                _uiState.update { it.copy(districts = districts) }
            }
        }
    }
    
    fun filterByDistrict(district: String?) {
        _uiState.update { state ->
            val filtered = if (district == null) {
                state.locations
            } else {
                state.locations.filter { it.district == district }
            }
            state.copy(
                selectedDistrict = district,
                filteredLocations = filtered
            )
        }
    }
}
