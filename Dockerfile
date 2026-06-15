FROM python:3.11-slim

WORKDIR /app

# 构建时一次性安装依赖，启动时不再重复安装
RUN pip install --no-cache-dir tornado>=4.5.0 paramiko>=2.3.1

COPY run.py .
COPY webssh/ webssh/
COPY .htpasswd .

EXPOSE 8888

CMD python run.py --address=0.0.0.0 --port=${PORT:-8888} --origin=same --policy=autoadd --authfile=.htpasswd
