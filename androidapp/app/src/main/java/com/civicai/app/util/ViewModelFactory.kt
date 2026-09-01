package com.civicai.app.util

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.civicai.app.AppContainer
import com.civicai.app.CivicAiApplication

/**
 * Small helper so every screen's ViewModel factory is a one-liner, e.g.:
 *
 *   val viewModel: HomeViewModel = viewModel(factory = viewModelFactory {
 *       HomeViewModel(it.cityDataRepository, it.reportsRepository)
 *   })
 */
inline fun <reified VM : ViewModel> viewModelFactory(
    crossinline create: (AppContainer) -> VM
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        val app = extras[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as CivicAiApplication
        @Suppress("UNCHECKED_CAST")
        return create(app.container) as T
    }
}
