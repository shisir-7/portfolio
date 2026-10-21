"""Shim so fontTools can use brotlicffi when the native `brotli` module is absent."""
import sys

try:
    import brotli  # noqa: F401
except ImportError:
    import brotlicffi

    class _BrotliModule:
        Decompressor = brotlicffi.Decompressor
        Compressor = brotlicffi.Compressor
        error = brotlicffi.error
        decompress = staticmethod(brotlicffi.decompress)
        compress = staticmethod(brotlicffi.compress)

    sys.modules["brotli"] = _BrotliModule
