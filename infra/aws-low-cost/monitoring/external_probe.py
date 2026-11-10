"""Independent edge probe. Private mode explicitly does not certify public API health."""
import json
import os
import socket
import urllib.error
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url):
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(urllib.request.Request(url, headers={'User-Agent': 'Vinnot-Operations/1'}), timeout=5) as response:
            return response.status, response.read(4096)
    except urllib.error.HTTPError as failure:
        return failure.code, b''


def probe(mode, get=request, resolve=socket.getaddrinfo):
    if mode not in ('private', 'public'):
        raise ValueError('Explicit private/public acceptance mode required')
    try:
        web_status, _ = get('https://vinnot.com/')
        if mode == 'private':
            # Verify DNS resolution without pretending the operator-only API is reachable here.
            resolve('api.vinnot.com', 443, type=socket.SOCK_STREAM)
            return {'healthy': web_status == 403, 'scope': 'private-edge-and-dns'}
        status, body = get('https://api.vinnot.com/api/actuator/health')
        return {'healthy': web_status == 200 and status == 200 and json.loads(body).get('status') == 'UP',
                'scope': 'public-web-and-api'}
    except Exception as failure:
        return {'healthy': False, 'scope': mode, 'failure_type': type(failure).__name__}


def handler(event, context):
    import boto3
    result = probe(os.environ['ACCEPTANCE_MODE'])
    boto3.client('cloudwatch').put_metric_data(Namespace='Vinnot/Production', MetricData=[{
        'MetricName': 'EdgeHealthy', 'Value': int(result['healthy']), 'Unit': 'Count',
        'StorageResolution': 60, 'Dimensions': [{'Name': 'Environment', 'Value': 'production'}]}])
    print(json.dumps(result))
    return result
