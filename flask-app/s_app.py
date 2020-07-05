import serverless_sdk
sdk = serverless_sdk.SDK(
    org_id='alexcaulfield',
    application_name='setlistify',
    app_uid='8dVxmL1Nnn1ypqPGgG',
    org_uid='m48rtgDQbkV3CyJnPj',
    deployment_uid='c57c6416-9197-44ac-bbe9-747ebea50f45',
    service_name='serverless-flask',
    should_log_meta=True,
    should_compress_logs=True,
    disable_aws_spans=False,
    disable_http_spans=False,
    stage_name='dev',
    plugin_version='3.6.13',
    disable_frameworks_instrumentation=False
)
handler_wrapper_kwargs = {'function_name': 'serverless-flask-dev-app', 'timeout': 6}
try:
    user_handler = serverless_sdk.get_user_handler('wsgi_handler.handler')
    handler = sdk.handler(user_handler, **handler_wrapper_kwargs)
except Exception as error:
    e = error
    def error_handler(event, context):
        raise e
    handler = sdk.handler(error_handler, **handler_wrapper_kwargs)
