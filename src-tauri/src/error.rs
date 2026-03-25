use serde::Serialize;
use thiserror::Error;

/// Resultado idiomático usado en el backend interno.
pub type AppResult<T> = Result<T, AppError>;

/// Error interno del backend con contexto estructurado.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    Validation(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{context}: {source}")]
    Io {
        context: &'static str,
        #[source]
        source: std::io::Error,
    },
    #[error("{context}: {source}")]
    Json {
        context: &'static str,
        #[source]
        source: serde_json::Error,
    },
    #[error("{0}")]
    Wallpaper(String),
    #[error("{0}")]
    Window(String),
    #[error("{0}")]
    Runtime(String),
    #[error("{0}")]
    Image(String),
}

impl AppError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }

    pub fn io(context: &'static str, source: std::io::Error) -> Self {
        Self::Io { context, source }
    }

    pub fn json(context: &'static str, source: serde_json::Error) -> Self {
        Self::Json { context, source }
    }

    pub fn wallpaper(message: impl Into<String>) -> Self {
        Self::Wallpaper(message.into())
    }

    pub fn window(message: impl Into<String>) -> Self {
        Self::Window(message.into())
    }

    pub fn runtime(message: impl Into<String>) -> Self {
        Self::Runtime(message.into())
    }

    pub fn image(message: impl Into<String>) -> Self {
        Self::Image(message.into())
    }
}

/// Error serializable devuelto al frontend por los comandos IPC.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl CommandError {
    pub fn new(code: &'static str, message: impl Into<String>, details: Option<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details,
        }
    }
}

/// Resultado serializable consumido por el frontend vía Tauri IPC.
pub type CommandResult<T> = Result<T, CommandError>;

impl From<AppError> for CommandError {
    fn from(error: AppError) -> Self {
        match error {
            AppError::Validation(message) => Self::new("validation_error", message, None),
            AppError::NotFound(message) => Self::new("not_found", message, None),
            AppError::Io { context, source } => {
                Self::new("io_error", context, Some(source.to_string()))
            }
            AppError::Json { context, source } => {
                Self::new("serialization_error", context, Some(source.to_string()))
            }
            AppError::Wallpaper(message) => Self::new("wallpaper_error", message, None),
            AppError::Window(message) => Self::new("window_error", message, None),
            AppError::Runtime(message) => Self::new("runtime_error", message, None),
            AppError::Image(message) => Self::new("image_error", message, None),
        }
    }
}